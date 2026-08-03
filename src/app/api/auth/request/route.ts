import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createLoginToken, isAuthConfigured, normalizeEmail, pruneLoginTokens } from "@/lib/auth";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const DEFAULT_FROM = "AEVIX <onboarding@resend.dev>";

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
 * Адрес, на который будет указывать ссылка из письма.
 *
 * Заголовку Host намеренно не доверяем в первую очередь: он приходит от клиента, и если
 * собирать ссылку из него, то подделанным Host можно заставить нас отправить человеку письмо со
 * ссылкой на чужой домен — перейдя по ней, он отдал бы свой токен входа. Поэтому сначала явно
 * заданный адрес, потом домен, который Vercel сообщает сам, и только в последнюю очередь —
 * origin запроса (это путь для локальной разработки, где подделывать нечего и некому).
 */
function appOrigin(request: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return new URL(request.url).origin;
}

function renderEmail(link: string) {
  return {
    subject: "Вход в AEVIX",
    text: [
      "Здравствуйте!",
      "",
      "Чтобы войти в AEVIX, перейдите по ссылке:",
      link,
      "",
      "Ссылка действует 15 минут и срабатывает один раз.",
      "Если вход запрашивали не вы — просто удалите это письмо, ничего не произойдёт.",
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#111">
        <p>Здравствуйте!</p>
        <p>Чтобы войти в AEVIX, нажмите кнопку:</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Войти в AEVIX</a>
        </p>
        <p style="color:#666;font-size:13px">Ссылка действует 15 минут и срабатывает один раз.<br>
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
    const token = await createLoginToken(email);
    const link = `${appOrigin(request)}/api/auth/callback?token=${encodeURIComponent(token)}`;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      // Ключа нет — письмо отправить нечем. Ссылка печатается в консоль сервера: это позволяет
      // работать и проверять вход локально. На проде без ключа войти будет невозможно, поэтому
      // ответ честно сообщает, каким способом «доставлена» ссылка, а не притворяется успехом.
      console.warn(`[auth] RESEND_API_KEY не настроен. Ссылка для входа ${email}:\n${link}`);
      return NextResponse.json({ sent: true, delivery: "console" });
    }

    const resend = new Resend(apiKey);
    const message = renderEmail(link);
    const { error } = await resend.emails.send({
      from: process.env.LEAD_EMAIL_FROM || DEFAULT_FROM,
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      // В отличие от заявки с лендинга, здесь письмо — единственный путь: не дошло, значит
      // человек не войдёт. Молчаливое {sent:false} превратилось бы в «нажимаю, ничего не
      // происходит», поэтому отвечаем ошибкой.
      console.error("[auth] Не удалось отправить письмо со ссылкой", error);
      return NextResponse.json({ error: "Не удалось отправить письмо. Попробуйте ещё раз." }, { status: 502 });
    }

    return NextResponse.json({ sent: true, delivery: "email" });
  } catch (error) {
    console.error("[auth] Запрос ссылки для входа не удался", error);
    return NextResponse.json({ error: "Не удалось выполнить вход. Попробуйте ещё раз." }, { status: 500 });
  }
}
