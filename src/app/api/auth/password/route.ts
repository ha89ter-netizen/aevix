import { NextResponse } from "next/server";
import { isAuthConfigured, normalizeEmail, sessionCookie, signInWithPassword } from "@/lib/auth";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
/**
 * Потолок по адресу — вторая линия. Подбор пароля тут дорог сам по себе: scrypt намеренно
 * медленный, и каждая попытка стоит времени процессора. Тридцать в минуту не мешают офису за
 * общим NAT и не дают перебирать всерьёз.
 */
const RATE_LIMIT_MAX_REQUESTS = 30;

// See the identical note in api/business-analysis/route.ts: per-instance only, not a hard cap.
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientId(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "anonymous"
  );
}

function isRateLimited(clientId: string) {
  const now = Date.now();
  const bucket = requestBuckets.get(clientId);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return true;
  bucket.count += 1;
  return false;
}

/** Что показать человеку по каждому исходу. Важно не «почему технически», а «что делать». */
const MESSAGES: Record<string, string> = {
  unknown: "Аккаунта с такой почтой нет. Проверьте адрес или создайте аккаунт.",
  wrong: "Неверный пароль. Проверьте раскладку или войдите по коду из письма.",
  "no-password": "У этого аккаунта ещё нет пароля. Войдите по коду из письма и задайте его в настройках.",
};

/**
 * Вход по паролю.
 *
 * Неизвестный адрес и неверный пароль различаются намеренно, по решению владельца продукта.
 * Плата за это названа вслух: ответ подтверждает, зарегистрирован ли адрес. Регистрация всё
 * равно раскрывает это занятым адресом, поэтому скрывать здесь было бы наполовину.
 */
export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Вход временно недоступен: на сервере не настроены база или ключ подписи сессий." },
      { status: 503 },
    );
  }

  if (isRateLimited(getClientId(request))) {
    return NextResponse.json(
      { error: "Слишком много попыток подряд. Подождите минуту и попробуйте снова." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Проверьте почту и пароль." }, { status: 400 });
  }

  const { email: rawEmail, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  const email = normalizeEmail(rawEmail);
  if (!email) return NextResponse.json({ error: "Проверьте адрес почты.", field: "email" }, { status: 400 });
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Введите пароль.", field: "password" }, { status: 400 });
  }

  try {
    const result = await signInWithPassword(email, password);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: MESSAGES[result.reason],
          reason: result.reason,
          field: result.reason === "unknown" ? "email" : "password",
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ user: result.user });
    response.cookies.set(sessionCookie(result.user));
    return response;
  } catch (error) {
    console.error("[auth] Вход по паролю не удался", error);
    return NextResponse.json({ error: "Не удалось выполнить вход. Попробуйте ещё раз." }, { status: 500 });
  }
}
