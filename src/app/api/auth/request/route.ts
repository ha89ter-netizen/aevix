import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createLoginCode, isAuthConfigured, normalizeEmail, pruneLoginTokens } from "@/lib/auth";
import { mailFrom } from "@/lib/mail";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// See the identical note in api/business-analysis/route.ts: per-instance only, not a hard cap.
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientId(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0]?.trim() ||
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
 * Письмо с кодом, а не со ссылкой.
 *
 * Ссылки здесь больше нет намеренно — см. пояснение в src/lib/auth.ts: она уводила человека в
 * другой браузер, а вместе с ним и сессию, оставляя проекты запертыми там, где вход начинался.
 *
 * Код разбит пробелом («123 456») только в тексте для глаза; вводится он как угодно, маршрут
 * проверки убирает пробелы сам.
 */
function renderEmail(code: string) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    subject: `${code} — код для входа в AEVIX`,
    text: [
      "Здравствуйте!",
      "",
      `Код для входа в AEVIX: ${spaced}`,
      "",
      "Введите его на странице входа. Код действует 15 минут и срабатывает один раз.",
      "Если вход запрашивали не вы — просто удалите это письмо, ничего не произойдёт.",
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#111">
        <p>Здравствуйте!</p>
        <p>Код для входа в AEVIX:</p>
        <p style="margin:24px 0;font-size:32px;font-weight:700;letter-spacing:0.18em">${spaced}</p>
        <p style="color:#666;font-size:13px">Введите его на странице входа. Код действует 15 минут и срабатывает один раз.<br>
        Если вход запрашивали не вы — просто удалите это письмо, ничего не произойдёт.</p>
      </div>
    `,
  };
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Вход временно недоступен: на сервере не настроены база или ключ подписи сессий." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Проверьте адрес почты." }, { status: 400 });
  }

  const email = normalizeEmail((body as { email?: unknown })?.email);
  if (!email) {
    return NextResponse.json({ error: "Проверьте адрес почты." }, { status: 400 });
  }

  if (isRateLimited(getClientId(request))) {
    return NextResponse.json(
      { error: "Слишком много попыток подряд. Подождите минуту и попробуйте снова." },
      { status: 429 },
    );
  }

  try {
    void pruneLoginTokens();
    const code = await createLoginCode(email);
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      // Ключа нет — письмо отправить нечем. Код печатается в консоль сервера: это позволяет
      // работать и проверять вход локально. На проде без ключа войти будет невозможно, поэтому
      // ответ честно сообщает, каким способом «доставлен» код, а не притворяется успехом.
      console.warn(`[auth] RESEND_API_KEY не настроен. Код для входа ${email}: ${code}`);
      return NextResponse.json({ sent: true, delivery: "console" });
    }

    const resend = new Resend(apiKey);
    const message = renderEmail(code);
    const { error } = await resend.emails.send({
      from: mailFrom(),
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      // В отличие от заявки с лендинга, здесь письмо — единственный путь: не дошло, значит
      // человек не войдёт. Молчаливое {sent:false} превратилось бы в «нажимаю, ничего не
      // происходит», поэтому отвечаем ошибкой.
      console.error("[auth] Не удалось отправить письмо с кодом", error);
      return NextResponse.json({ error: "Не удалось отправить письмо. Попробуйте ещё раз." }, { status: 502 });
    }

    return NextResponse.json({ sent: true, delivery: "email" });
  } catch (error) {
    console.error("[auth] Запрос кода для входа не удался", error);
    return NextResponse.json({ error: "Не удалось выполнить вход. Попробуйте ещё раз." }, { status: 500 });
  }
}
