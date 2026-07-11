import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 1500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const REQUEST_TIMEOUT_MS = 22_000;

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

type BusinessAnalysis = {
  summary: string;
  problems: string[];
  recommendations: string[];
  flow: string[];
  callToAction: string;
};

const SYSTEM_INSTRUCTIONS = `Ты — AI-консультант digital-студии AEVIX.

Твоя задача — анализировать описание малого бизнеса и простыми словами объяснять, какие процессы можно автоматизировать.

Целевая аудитория:
барбершопы, салоны красоты, парфюмерные и другие магазины, кофейни, рестораны и малый бизнес.

Возможности AEVIX:
- AI-консультанты;
- автоматизация ответов;
- онлайн-запись;
- Telegram и WhatsApp-боты;
- сайты;
- CRM-интеграции;
- напоминания;
- сбор отзывов;
- NFC-карточки как бонус к комплексным проектам.

Правила ответа:
- отвечай только на русском;
- не используй сложный технический жаргон;
- не выдумывай статистику, клиентов, гарантии и результаты;
- не обещай конкретный рост прибыли;
- сначала кратко опиши проблему бизнеса;
- затем предложи 3–6 подходящих решений;
- объясни понятный практический эффект;
- в конце предложи обсудить проект через WhatsApp, Telegram или email;
- ответ должен быть полезным и занимать примерно 120–250 слов;
- верни только JSON по схеме, без markdown и без пояснений вне JSON.`;

const BUSINESS_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "problems", "recommendations", "flow", "callToAction"],
  properties: {
    summary: {
      type: "string",
      description: "Краткое описание проблемы бизнеса простыми словами.",
    },
    problems: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
    flow: {
      type: "array",
      minItems: 4,
      maxItems: 7,
      items: { type: "string" },
      description: "Короткая карта процесса, например: Клиент, AI-консультант, Запись, CRM.",
    },
    callToAction: {
      type: "string",
      description: "Мягкое предложение обсудить проект через WhatsApp, Telegram или email.",
    },
  },
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
    requestBuckets.set(clientId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
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

function isStringArray(value: unknown, min: number, max: number) {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function validateAnalysis(value: unknown): BusinessAnalysis | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<BusinessAnalysis>;

  if (typeof candidate.summary !== "string" || !candidate.summary.trim()) return null;
  if (!isStringArray(candidate.problems, 1, 4)) return null;
  if (!isStringArray(candidate.recommendations, 3, 6)) return null;
  if (!isStringArray(candidate.flow, 4, 7)) return null;
  if (typeof candidate.callToAction !== "string" || !candidate.callToAction.trim()) return null;

  const problems = candidate.problems as string[];
  const recommendations = candidate.recommendations as string[];
  const flow = candidate.flow as string[];

  return {
    summary: candidate.summary.trim(),
    problems: problems.map((item) => item.trim()),
    recommendations: recommendations.map((item) => item.trim()),
    flow: flow.map((item) => item.trim()),
    callToAction: candidate.callToAction.trim(),
  };
}

function toReadableAnalysis(analysis: BusinessAnalysis) {
  return [
    analysis.summary,
    `Что можно улучшить: ${analysis.problems.join("; ")}.`,
    `Подходящие решения: ${analysis.recommendations.join("; ")}.`,
    analysis.callToAction,
  ].join("\n\n");
}

export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  const message = body?.message;

  if (typeof message !== "string") {
    return NextResponse.json(
      { error: "Сообщение должно быть строкой." },
      { status: 400 },
    );
  }

  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return NextResponse.json(
      { error: "Опишите бизнес или задачу, чтобы AI-консультант смог провести анализ." },
      { status: 400 },
    );
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Сообщение слишком длинное. Максимум — ${MAX_MESSAGE_LENGTH} символов.` },
      { status: 413 },
    );
  }

  if (isRateLimited(getClientId(request))) {
    return NextResponse.json(
      { error: "Слишком много запросов подряд. Подождите минуту и попробуйте снова." },
      { status: 429 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI-консультант временно недоступен. Серверный ключ OpenAI еще не настроен." },
      { status: 503 },
    );
  }

  try {
    const client = new OpenAI({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await client.responses.create(
      {
        model: "gpt-4.1-mini",
        instructions: SYSTEM_INSTRUCTIONS,
        input: trimmedMessage,
        max_output_tokens: 900,
        text: {
          format: {
            type: "json_schema",
            name: "aevix_business_analysis",
            strict: true,
            schema: BUSINESS_ANALYSIS_SCHEMA,
          },
          verbosity: "medium",
        },
      },
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    const rawAnalysis = response.output_text?.trim();

    if (!rawAnalysis) {
      return NextResponse.json(
        { error: "AI-консультант не смог подготовить ответ. Попробуйте переформулировать запрос." },
        { status: 502 },
      );
    }

    const parsed = validateAnalysis(JSON.parse(rawAnalysis));

    if (!parsed) {
      return NextResponse.json(
        { error: "AI-консультант подготовил ответ в неверном формате. Попробуйте еще раз." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      analysis: toReadableAnalysis(parsed),
      result: parsed,
    });
  } catch {
    console.error("Business analysis failed");

    return NextResponse.json(
      { error: "Не удалось выполнить анализ. Попробуйте еще раз немного позже." },
      { status: 502 },
    );
  }
}
