import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createLoginCode, isAuthConfigured, normalizeEmail, passwordProblem, registerUser } from "@/lib/auth";
import { mailFrom } from "@/lib/mail";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_NAME_LENGTH = 60;

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

/**
 * Регистрация: имя, почта, пароль.
 *
 * Успешная регистрация сразу выдаёт сессию — просить человека войти тем же паролем, который он
 * только что дважды набрал, значит требовать работу без причины.
 *
 * Проверка совпадения паролей делается и здесь, а не только в форме: на сервер приходит то, что
 * прислали, а не то, что показывала страница.
 */
export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Регистрация временно недоступна: на сервере не настроены база или ключ подписи сессий." },
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
    return NextResponse.json({ error: "Проверьте заполненные поля." }, { status: 400 });
  }

  const { name: rawName, email: rawEmail, password, confirm } = (body ?? {}) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    confirm?: unknown;
  };

  const email = normalizeEmail(rawEmail);
  if (!email) return NextResponse.json({ error: "Проверьте адрес почты.", field: "email" }, { status: 400 });

  const name = typeof rawName === "string" ? rawName.trim().slice(0, MAX_NAME_LENGTH) : "";
  if (name.length < 2) {
    return NextResponse.json({ error: "Как вас зовут? Хотя бы два символа.", field: "name" }, { status: 400 });
  }

  if (typeof password !== "string") {
    return NextResponse.json({ error: "Придумайте пароль.", field: "password" }, { status: 400 });
  }
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem, field: "password" }, { status: 400 });
  if (password !== confirm) {
    return NextResponse.json({ error: "Пароли не совпадают.", field: "confirm" }, { status: 400 });
  }

  try {
    const result = await registerUser(email, name, password);
    if (!result.ok) {
      // Занятый адрес называем прямо: иначе человек не узнает, что аккаунт у него уже есть.
      // Это раскрывает существование адреса, но регистрация раскрывает его в любом случае —
      // молчание здесь стоило бы понятности и ничего бы не защитило.
      return NextResponse.json(
        { error: "Аккаунт с такой почтой уже есть. Войдите в него.", field: "email", reason: "duplicate" },
        { status: 409 },
      );
    }

    /**
     * Сессия здесь НЕ выдаётся, и это главное в маршруте.
     *
     * Завести запись на чужой адрес может кто угодно — почта на этом шаге ничем не подтверждена.
     * Раньше регистрация сразу пускала внутрь, и посторонний, указавший чужой адрес, работал в
     * аккаунте, в который потом входил настоящий владелец: `findOrCreateUser` после законного
     * входа по коду находил ту же строку. Доступ теперь даёт только код из письма, то есть
     * доказанное владение ящиком.
     *
     * Имя и пароль едут ВМЕСТЕ С КОДОМ и применяются при его вводе. Если код запросит настоящий
     * владелец, он погасит чужой неиспользованный код, а с ним и чужой пароль.
     */
    const code = await createLoginCode(email, { name, password });
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      // Тот же осознанный путь, что у входа по коду: локально письмо отправить нечем, и код
      // печатается в консоль сервера. Ответ честно называет способ доставки.
      console.warn(`[auth] RESEND_API_KEY не настроен. Код подтверждения ${email}: ${code}`);
      return NextResponse.json({ verify: true, delivery: "console" });
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: mailFrom(),
      to: email,
      subject: `Код подтверждения AEVIX: ${code}`,
      text: `Код подтверждения: ${code}\n\nВведите его, чтобы завершить регистрацию. Код действует 15 минут.\nЕсли регистрацию начинали не вы — просто не вводите код, аккаунт останется недоступным.`,
      html: `<p>Код подтверждения: <b style="font-size:22px;letter-spacing:.18em">${code}</b></p><p>Введите его, чтобы завершить регистрацию. Код действует 15 минут.</p><p>Если регистрацию начинали не вы — просто не вводите код, аккаунт останется недоступным.</p>`,
    });

    if (error) {
      console.error("[auth] Не удалось отправить код подтверждения", error);
      return NextResponse.json({ error: "Не удалось отправить письмо. Попробуйте ещё раз." }, { status: 502 });
    }

    return NextResponse.json({ verify: true, delivery: "email" });
  } catch (error) {
    console.error("[auth] Регистрация не удалась", error);
    return NextResponse.json({ error: "Не удалось создать аккаунт. Попробуйте ещё раз." }, { status: 500 });
  }
}
