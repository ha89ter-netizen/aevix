import { Resend } from "resend";
import { NextResponse } from "next/server";
import { mailFrom } from "@/lib/mail";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
// Получатель заявок (`LEADS_TO_EMAIL`) — ОБЯЗАТЕЛЬНАЯ server-side конфигурация, читается в POST на
// каждый запрос. Хардкод-фолбэка на личный адрес НЕТ: без переменной письмо не отправляется вовсе.

// See the identical note in api/business-analysis/route.ts: per-instance only, not a hard cap.
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

type LeadPayload = {
  name: string;
  contact: string;
  business: string;
  task: string;
  niche: string;
};

function getClientId(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    firstForwardedIp ||
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

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  bucket.count += 1;
  return false;
}

async function parseRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function cleanRequired(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

function cleanOptional(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function validateLead(value: unknown): LeadPayload | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Record<keyof LeadPayload, unknown>>;

  const name = cleanRequired(candidate.name, 120);
  const contact = cleanRequired(candidate.contact, 160);
  if (!name || !contact) return null;

  return {
    name,
    contact,
    business: cleanOptional(candidate.business, 900),
    task: cleanOptional(candidate.task, 900),
    niche: cleanOptional(candidate.niche, 80),
  };
}

// Simple, single-purpose HTML escape — this is the only place lead text is interpolated into
// markup, so a full sanitizer would be overkill.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLeadHtml(lead: LeadPayload) {
  const rows: Array<[string, string]> = [
    ["Имя", lead.name],
    ["Контакт", lead.contact],
  ];
  if (lead.niche) rows.push(["Ниша", lead.niche]);
  if (lead.business) rows.push(["Бизнес", lead.business]);
  if (lead.task) rows.push(["Задача", lead.task]);

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#666;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;">${escapeHtml(value).replace(/\n/g, "<br/>")}</td></tr>`,
    )
    .join("");

  return `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;color:#111;">
  <p style="font-weight:600;font-size:16px;margin:0 0 12px;">Новая заявка с сайта AEVIX</p>
  <table cellpadding="0" cellspacing="0">${rowsHtml}</table>
</div>`;
}

function renderLeadText(lead: LeadPayload) {
  const lines = [
    "Новая заявка с сайта AEVIX",
    "",
    `Имя: ${lead.name}`,
    `Контакт: ${lead.contact}`,
    lead.niche ? `Ниша: ${lead.niche}` : null,
    lead.business ? `Бизнес: ${lead.business}` : null,
    lead.task ? `Задача: ${lead.task}` : null,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

export async function POST(request: Request) {
  const body = await parseRequestBody(request);

  // Honeypot: скрытое поле `company` видят только боты (человек его не видит и не заполняет). Если
  // заполнено — тихо отвечаем «ок», НЕ отправляя письмо: бот не понимает, что отфильтрован, и не
  // повторяет. Тихое средство без CAPTCHA (§6).
  if (body && typeof body === "object" && typeof (body as { company?: unknown }).company === "string" && (body as { company: string }).company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const lead = validateLead(body);

  if (!lead) {
    return NextResponse.json({ error: "Укажите имя и контакт." }, { status: 400 });
  }

  if (isRateLimited(getClientId(request))) {
    return NextResponse.json(
      { error: "Слишком много заявок подряд. Подождите минуту и попробуйте снова." },
      { status: 429 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.LEADS_TO_EMAIL;

  // Доставка заявки — ОБЯЗАТЕЛЬНАЯ конфигурация: нужен и ключ, и получатель. Нет любого из двух →
  // контролируемый config-failure: НЕ пытаемся слать письмо (и уж точно не на скрытый захардкоженный
  // адрес), возвращаем 503, клиент показывает обычный честный error-state. В логи — только факт «не
  // настроено», без payload заявки (§10, privacy).
  if (!apiKey || !recipient) {
    console.error("Lead email failed: delivery is not configured (RESEND_API_KEY / LEADS_TO_EMAIL)");
    return NextResponse.json({ error: "Не удалось отправить заявку. Попробуйте ещё раз." }, { status: 503 });
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: mailFrom(),
      to: recipient,
      replyTo: lead.contact.includes("@") ? lead.contact : undefined,
      subject: `Новая заявка с сайта AEVIX — ${lead.name}`,
      html: renderLeadHtml(lead),
      text: renderLeadText(lead),
    });

    if (error) {
      // Логируем факт ошибки провайдера, но НЕ payload заявки (телефон/имя не уходят в логи, §10).
      console.error("Lead email failed: provider error");
      return NextResponse.json({ error: "Не удалось отправить заявку. Попробуйте ещё раз." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    console.error("Lead email failed: unexpected error");
    return NextResponse.json({ error: "Не удалось отправить заявку. Попробуйте ещё раз." }, { status: 502 });
  }
}
