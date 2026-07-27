import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const LEAD_NOTIFICATION_EMAIL = "ha89ter@gmail.com";
const DEFAULT_FROM = "AEVIX <onboarding@resend.dev>";

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

  if (!apiKey) {
    // Lead capture is a best-effort backup channel behind the visible WhatsApp/Telegram flow —
    // a missing key must never surface as a hard error to the visitor, it just means the email
    // copy of this lead was not sent.
    console.error("Lead email skipped: RESEND_API_KEY is not configured");
    return NextResponse.json({ sent: false });
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.LEAD_EMAIL_FROM || DEFAULT_FROM,
      to: LEAD_NOTIFICATION_EMAIL,
      replyTo: lead.contact.includes("@") ? lead.contact : undefined,
      subject: `Новая заявка с сайта AEVIX — ${lead.name}`,
      html: renderLeadHtml(lead),
      text: renderLeadText(lead),
    });

    if (error) {
      console.error("Lead email failed", error);
      return NextResponse.json({ sent: false }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Lead email failed", err);
    return NextResponse.json({ sent: false }, { status: 502 });
  }
}
