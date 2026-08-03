import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_REQUEST_BYTES = 4_000;

// Per-instance only, like the other routes — a soft brake, not a hard cap.
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Reads a free-text edit request into ONE of the designer's existing intents.
 *
 * The model never writes to the project and never invents an operation: it only chooses from a
 * closed list and extracts the couple of values that go with it. Everything it returns is then
 * applied by the same bounded, reversible code path as a locally-resolved request, so an
 * unexpected answer can at worst be a wrong-but-safe edit the user can undo — never an
 * unbounded rewrite.
 *
 * This exists because the local keyword matcher covers common phrasings only. Without it, a
 * perfectly reasonable "хочу поглуше и посолиднее" gets told its wording was wrong, which is
 * exactly where a product stops feeling like a designer and starts feeling like a command line.
 */
const SYSTEM_INSTRUCTIONS = `Ты — интерпретатор запросов к AI-дизайнеру сайта.

Твоя задача: определить, какую ОДНУ операцию просит пользователь, и вернуть её в JSON.

Доступные операции:
- darker — сделать оформление темнее/контрастнее/строже
- lighter — сделать светлее/воздушнее
- style — сменить визуальный стиль (value: minimal|luxury|premium|tech|organic|elegant|editorial|modern|brutalist|glass|futuristic|soft|bold)
- layout — сменить макет/композицию (value: classic|editorial|showcase)
- typography — усилить типографику, иерархию заголовков
- add-section — добавить блок (value: reviews|faq|gallery)
- remove-section — убрать блок (value: reviews|faq|gallery)
- edit-heading — заменить главный заголовок (text: новый заголовок)
- edit-text — заменить подзаголовок/описание (text: новый текст)
- edit-price — изменить цену позиции (target: название позиции, text: только число)
- remove-offer — удалить позицию из прайса (target: название позиции)
- unknown — если запрос не соответствует ни одной операции

Правила:
- выбирай ровно одну операцию;
- не придумывай названия позиций, которых нет в переданном списке;
- text для edit-price — только цифры, без валюты;
- если пользователь просит что-то за пределами списка, возвращай unknown.`;

const INTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "value", "target", "text"],
  properties: {
    intent: {
      type: "string",
      enum: [
        "darker",
        "lighter",
        "style",
        "layout",
        "typography",
        "add-section",
        "remove-section",
        "edit-heading",
        "edit-text",
        "edit-price",
        "remove-offer",
        "unknown",
      ],
    },
    value: { type: "string" },
    target: { type: "string" },
    text: { type: "string" },
  },
} as const;

function getClientId(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
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

export async function POST(request: Request) {
  let body: { request?: unknown; offers?: unknown; sections?: unknown } | null = null;
  try {
    const text = await request.text();
    if (text.length > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ intent: null });
  }

  const userRequest = typeof body?.request === "string" ? body.request.trim().slice(0, 400) : "";
  if (!userRequest) return NextResponse.json({ intent: null });

  if (isRateLimited(getClientId(request))) {
    return NextResponse.json({ error: "Слишком много запросов подряд." }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  // No key configured: the caller keeps the local result, which is the honest "не понял".
  if (!apiKey) return NextResponse.json({ intent: null, source: "unavailable" });

  const offers = Array.isArray(body?.offers) ? (body.offers as unknown[]).slice(0, 60) : [];
  const sections = Array.isArray(body?.sections) ? (body.sections as unknown[]).slice(0, 12) : [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create(
      {
        model: "gpt-4.1-mini",
        instructions: SYSTEM_INSTRUCTIONS,
        input: JSON.stringify({ request: userRequest, offers, sections }),
        max_output_tokens: 300,
        text: {
          format: { type: "json_schema", name: "aevix_designer_intent", strict: true, schema: INTENT_SCHEMA },
          // gpt-4.1-mini принимает только "medium": "low" отклоняется с 400.
          verbosity: "medium",
        },
      },
      { signal: controller.signal },
    );

    const raw = response.output_text?.trim();
    if (!raw) return NextResponse.json({ intent: null });
    const parsed = JSON.parse(raw) as { intent?: string; value?: string; target?: string; text?: string };
    if (!parsed.intent || parsed.intent === "unknown") return NextResponse.json({ intent: null });

    return NextResponse.json({
      intent: {
        id: parsed.intent,
        // Empty strings are how a strict schema says "not applicable"; drop them so the caller
        // sees genuinely absent fields rather than blanks it has to re-check.
        value: parsed.value || undefined,
        target: parsed.target || undefined,
        text: parsed.text || undefined,
      },
      source: "ai",
    });
  } catch (err) {
    // Статус и текст ошибки OpenAI пишутся в лог (ключ в них уже маскирован самим
    // OpenAI). Без этого «неверный ключ» выглядит для пользователя как «сеть недоступна»,
    // и настоящая причина не сохраняется нигде.
    console.error("Designer intent resolution failed:", (err as { status?: number }).status, (err as Error).message?.slice(0, 300));
    return NextResponse.json({ intent: null });
  } finally {
    clearTimeout(timeout);
  }
}
