import { NextResponse } from "next/server";
import { consumeLoginCode, isAuthConfigured, normalizeEmail, sessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
/**
 * Ограничение по адресу — вторая линия, а не первая. Настоящая защита от перебора живёт в
 * `consumeLoginCode`: пять неверных вводов сжигают код, то есть на один код приходится максимум
 * пять догадок из миллиона, сколько бы запросов ни пришло.
 *
 * Поэтому здесь потолок не жадный. Первым порывом было поставить 10, но за одним адресом сидит
 * не один человек: офис, кафе, мобильный оператор с общим NAT. При десяти двое-трое коллег,
 * входящих одновременно, блокировали бы друг друга — защита, которая мешает своим и не мешает
 * чужим, потому что счётчик по коду перебор уже остановил.
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

/** Что показать человеку по каждой причине отказа. Отдельно от текста в коде — здесь важно не
 * «почему технически», а «что делать дальше». */
const MESSAGES: Record<string, string> = {
  invalid: "Неверный код. Проверьте цифры из письма.",
  expired: "Срок действия кода истёк. Запросите новый — он действует 15 минут.",
  used: "Этот код уже использован. Запросите новый.",
  attempts: "Слишком много неверных попыток. Запросите новый код.",
};

/**
 * Проверка кода из письма. Пришёл на смену переходу по ссылке.
 *
 * Отвечает JSON, а не редиректом: человек не уходил со страницы входа, он там же и остаётся —
 * в том самом браузере, где начал. Именно ради этого код и заменил ссылку (см. src/lib/auth.ts).
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
    return NextResponse.json({ error: MESSAGES.invalid }, { status: 400 });
  }

  const { email: rawEmail, code } = (body ?? {}) as { email?: unknown; code?: unknown };
  const email = normalizeEmail(rawEmail);
  if (!email) return NextResponse.json({ error: "Проверьте адрес почты." }, { status: 400 });

  try {
    const result = await consumeLoginCode(email, code);
    if (!result.ok) {
      return NextResponse.json({ error: MESSAGES[result.reason] ?? MESSAGES.invalid, reason: result.reason }, { status: 401 });
    }

    const response = NextResponse.json({ user: result.user });
    response.cookies.set(sessionCookie(result.user));
    return response;
  } catch (error) {
    console.error("[auth] Проверка кода не удалась", error);
    return NextResponse.json({ error: "Не удалось выполнить вход. Попробуйте ещё раз." }, { status: 500 });
  }
}
