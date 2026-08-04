import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "./db";

/**
 * Вход по коду подтверждения и сессия.
 *
 * Пароля нет намеренно: нечего хранить, нечего утекать, нечего восстанавливать. Человек вводит
 * почту, получает шестизначный код и вводит его на той же странице.
 *
 * Раньше здесь была ссылка из письма, и её пришлось убрать по осязаемой причине. Ссылка
 * открывается в том браузере, который выбрал почтовый клиент, а не в том, где человек начал
 * вход: заказ с ноутбука, письмо открыто на телефоне — сессия достаётся телефону. Обычно это
 * неудобство, но у нас перенос проектов в аккаунт читает `localStorage` ТОГО браузера, где
 * случился вход. Значит вход не в том браузере оставляет проекты запертыми в первом, и человек
 * их в аккаунте уже не увидит. Код никуда не уводит: человек остаётся во вкладке, где начал.
 *
 * Побочно это лечит и корпоративные почтовые сканеры, которые «прощёлкивают» ссылки заранее и
 * тем сжигают одноразовый токен до того, как до него доберётся адресат.
 *
 * Написано руками, а не через библиотеку авторизации. Причина та же, по которой AI-дизайнер не
 * обёртка над чатом: задача узкая и полностью укладывается в три таблицы и две операции, а
 * библиотека принесла бы свою схему таблиц поверх той, что уже описана в docs/database.md.
 * Всё, что здесь есть, стоит на стандартном модуле crypto.
 *
 * ТОЛЬКО серверный модуль: импорт из клиентского компонента вытащит в браузер и секрет, и доступ
 * к базе.
 */

const SESSION_COOKIE = "aevix_session";
/** Тридцать дней: достаточно, чтобы не просить почту при каждом возвращении. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Пятнадцать минут на ввод кода — хватает дойти до почты и вернуться. */
const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
/** Неверных вводов на один код. Шесть цифр — миллион вариантов, и без потолка их можно перебрать. */
const MAX_CODE_ATTEMPTS = 5;

export type SessionUser = { id: string; email: string };

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET не задан — подписывать сессии нечем. См. .env.example.");
  return value;
}

/** Настроен ли вход. Позволяет маршруту ответить 503, а не упасть с 500. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.DATABASE_URL);
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  // Намеренно нестрогая проверка: задача — отсечь очевидный мусор, а не спорить с RFC 5322.
  // Настоящая проверка адреса — дошло ли письмо.
  if (email.length < 3 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Сравнение подписей постоянного времени: обычное `===` выходит из сравнения на первом
 * несовпавшем байте и по времени ответа подсказывает, сколько символов угадано. */
function signatureMatches(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Сессия — это подписанный слепок, а не ссылка на строку в базе: проверка входящего запроса
 * не требует обращения к базе. Плата за это — досрочно отозвать одну сессию нельзя, только
 * сменить AUTH_SECRET и разлогинить всех. При нынешнем размере продукта это верный размен.
 */
type SessionPayload = { uid: string; email: string; exp: number };

function encodeSession(user: SessionUser): string {
  const payload: SessionPayload = { uid: user.id, email: user.email, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(value: string | undefined): SessionUser | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  if (!signatureMatches(sign(body), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.uid !== "string" || typeof payload.email !== "string") return null;
    return { id: payload.uid, email: payload.email };
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Текущий пользователь запроса, или null. Единственный способ узнать, кто пришёл. */
export function currentUser(request: Request): SessionUser | null {
  if (!process.env.AUTH_SECRET) return null;
  return decodeSession(readCookie(request, SESSION_COOKIE));
}

/** Параметры cookie для NextResponse.cookies.set. */
export function sessionCookie(user: SessionUser) {
  return {
    name: SESSION_COOKIE,
    value: encodeSession(user),
    httpOnly: true, // недоступна из JavaScript: украсть её через XSS нельзя
    secure: process.env.NODE_ENV === "production", // на localhost нет https, иначе cookie не поставится
    sameSite: "lax" as const, // переход по ссылке из письма — навигация верхнего уровня, lax её пропускает
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function expiredSessionCookie() {
  return { ...sessionCookie({ id: "", email: "" }), value: "", maxAge: 0 };
}

/**
 * HMAC, а не обычный хеш. У шестизначного кода миллион значений, поэтому SHA-256 от него
 * восстанавливается перебором по дампу базы за секунды. HMAC на серверном ключе делает такой
 * перебор невозможным без самого ключа. Почта входит в подпись, чтобы один и тот же код у
 * разных людей давал разные значения.
 */
function hashCode(email: string, code: string): string {
  return createHmac("sha256", secret()).update(`${email}:${code}`).digest("hex");
}

/** Шесть цифр. randomInt — равномерный источник; остаток от деления случайных байт дал бы
 * перекос в сторону младших кодов. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Создаёт одноразовый код входа и возвращает его — он существует только в этот момент и в
 * письме; в базе лежит лишь подпись.
 */
export async function createLoginCode(email: string): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS);
  const sql = db();
  // Прошлые неиспользованные коды для этого адреса гасятся: запросив новый, человек ожидает,
  // что старый больше не работает.
  await sql`delete from login_tokens where email = ${email} and used_at is null`;
  await sql`
    insert into login_tokens (token_hash, email, expires_at)
    values (${hashCode(email, code)}, ${email}, ${expiresAt.toISOString()})
  `;
  return code;
}

export type ConsumeResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "invalid" | "expired" | "used" | "attempts" };

/**
 * Проверяет код, гасит его и выдаёт пользователя, заводя аккаунт при первом входе.
 *
 * Код одноразовый: пометка used_at ставится условием самого UPDATE, поэтому два одновременных
 * ввода одного кода не могут оба оказаться успешными — второй не найдёт строку.
 *
 * Неверный код увеличивает счётчик попыток у ЖИВОГО кода этой почты, и на пятой промашке код
 * сгорает. Без этого шесть цифр перебирались бы за миллион запросов.
 */
export async function consumeLoginCode(email: string, code: unknown): Promise<ConsumeResult> {
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    await registerFailedAttempt(email);
    return { ok: false, reason: "invalid" };
  }

  const sql = db();
  const hash = hashCode(email, code.trim());
  const rows = (await sql`
    select email, expires_at, used_at, attempts from login_tokens where token_hash = ${hash}
  `) as Array<{ email: string; expires_at: string; used_at: string | null; attempts: number }>;

  const row = rows[0];
  if (!row) {
    // Код не подошёл. Промашка засчитывается живому коду этой почты, иначе счётчик никогда бы
    // не рос: у неверного кода своей строки в базе нет.
    const burned = await registerFailedAttempt(email);
    return { ok: false, reason: burned ? "attempts" : "invalid" };
  }
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const claimed = (await sql`
    update login_tokens set used_at = now()
    where token_hash = ${hash} and used_at is null
    returning email
  `) as Array<{ email: string }>;
  if (!claimed[0]) return { ok: false, reason: "used" };

  return { ok: true, user: await findOrCreateUser(row.email) };
}

/** Засчитывает неверный ввод. Возвращает true, если код после этого сгорел. */
async function registerFailedAttempt(email: string): Promise<boolean> {
  const sql = db();
  const rows = (await sql`
    update login_tokens set attempts = attempts + 1
    where email = ${email} and used_at is null
    returning attempts
  `) as Array<{ attempts: number }>;

  const attempts = rows[0]?.attempts ?? 0;
  if (attempts < MAX_CODE_ATTEMPTS) return false;

  // Исчерпан — гасим так же, как использованный: строка остаётся, чтобы ответить внятно.
  await sql`update login_tokens set used_at = now() where email = ${email} and used_at is null`;
  return true;
}

async function findOrCreateUser(email: string): Promise<SessionUser> {
  const sql = db();
  const existing = (await sql`select id, email from users where email = ${email}`) as SessionUser[];
  if (existing[0]) return existing[0];

  const id = randomUUID();
  // on conflict — на случай двух одновременных первых входов с одного адреса: выигрывает первый,
  // второй читает уже созданную строку вместо падения на уникальном индексе.
  const inserted = (await sql`
    insert into users (id, email) values (${id}, ${email})
    on conflict (email) do update set email = excluded.email
    returning id, email
  `) as SessionUser[];
  return inserted[0];
}

/** Убирает просроченные и использованные ссылки. Вызывается попутно при запросе новой. */
export async function pruneLoginTokens(): Promise<void> {
  try {
    await db()`delete from login_tokens where expires_at < now() - interval '1 day'`;
  } catch {
    // Уборка не должна мешать входу: не получилось — не страшно, попробуем в следующий раз.
  }
}
