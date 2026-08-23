import OpenAI from "openai";
import { NextResponse } from "next/server";
import { productPriceContext, FIRST_PROJECT_DISCOUNT_LINE } from "@/lib/aevix-products";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 1500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const REQUEST_TIMEOUT_MS = 22_000;

// In-memory, per-instance rate limiting: a cheap, honest deterrent against casual abuse, but
// not a real ceiling — Vercel can run multiple instances of this function concurrently, each
// with its own empty Map, and a cold start resets it too. Fine at current traffic; if usage
// grows, replace with a shared store (Vercel KV / Upstash Redis) so limits hold across instances.
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

type BusinessAnalysis = {
  shortAnswer: string;
  reasons: string[];
  recommendedSolution: string;
  summary: string;
  problems: string[];
  recommendations: string[];
  flow: string[];
  callToAction: string;
};

type EstimateContext = {
  businessType: string;
  selectedServices: string[];
  branchCount: string;
  manualWork: string;
  currentServices: string;
  localRange: string;
};

type PersonalEstimate = {
  summary: string;
  recommendedModules: string[];
  estimatedRange: string;
  implementationSteps: string[];
  risks: string[];
  callToAction: string;
};

const SYSTEM_INSTRUCTIONS = `Ты — AI-консультант digital-студии AEVIX. Ты ведёшь себя как живой консультант, а не как генератор отчётов.

Твоя задача — понять, что именно спрашивает или описывает пользователь, и СНАЧАЛА прямо ответить на это, а уже потом при необходимости развернуть полный разбор.

Целевая аудитория:
барбершопы, салоны красоты, парфюмерные и другие магазины, кофейни, рестораны и малый бизнес.

Актуальные услуги и цены AEVIX (модель «основа + возможности + каналы»; AI — интеллект, Telegram/WhatsApp/сайт — каналы, где он работает):
${productPriceContext()}

Правила по ценам:
- используй только эти цены, ничего не выдумывай и не занижай/не завышай;
- не путай канал и возможность: Telegram включён (Bot API бесплатен), WhatsApp требует разового подключения Business API — так и объясняй разницу, а не наценкой «из воздуха»;
- платные услуги пиши как «от N ₸» (стартовая цена), включённые и «по составу» — как есть;
- рекомендуй услуги от более дорогих к более дешёвым (сначала комплексные и дорогие, затем по убыванию);
- для каждой рекомендованной услуги коротко объясни, чем именно она поможет этому бизнесу;
- если пользователь спрашивает про точную стоимость или расчёт — предложи открыть калькулятор на сайте для персонального расчёта.

Честность важнее продажи:
- не рекомендуй услугу только потому, что она есть в прайсе;
- если бизнесу на его текущем этапе что-то не нужно — прямо скажи об этом («CRM вам пока не нужна», «Telegram/WhatsApp достаточно», «сначала стоит наладить приток клиентов, а не автоматизацию» и т.п.);
- если полноценная автоматизация не даст ощутимого эффекта прямо сейчас — так и скажи, вместо того чтобы предлагать максимум услуг;
- цель — помочь пользователю принять верное решение, а не продать как можно больше.

Персонализация обязательна:
- используй конкретные детали, которые указал пользователь (откуда приходят клиенты, сколько сотрудников, какой канал уже используется, объём заявок и т.д.);
- каждая причина в reasons и каждая рекомендация должны явно опираться на то, что написал пользователь, а не звучать как универсальный совет;
- если пользователь упомянул конкретный канал (Instagram, WhatsApp и т.д.) — отвечай применительно именно к нему.

Структура ответа (сначала ответ, затем отчёт):
1. shortAnswer — прямой ответ на вопрос или ситуацию пользователя, 2–5 предложений; если уместно, начни с «Да.» или «Нет.»; должно быть понятно за 5 секунд, без долгих вступлений;
2. reasons — 3–5 коротких причин, почему сделан именно такой вывод; каждая опирается на слова пользователя;
3. recommendedSolution — одно ясно сформулированное рекомендованное решение (не список), объясняющее следующий практический шаг;
4. summary — короткое описание ситуации бизнеса (1–2 предложения, не повторяй дословно shortAnswer);
5. problems — 1–4 пункта: что мешает бизнесу сейчас;
6. recommendations — 3–6 пунктов с конкретными решениями (у релевантных услуг указывай цену «от N ₸»); если в shortAnswer/recommendedSolution уже сказано, что услуга не нужна — не включай её сюда;
7. flow — короткая карта процесса (4–7 шагов), отражающая именно этот бизнес, а не общий пример; каждый шаг — короткое действие в 2–5 слов (например «Клиент оставляет заявку», «Проверяется расписание»), без длинных формулировок и без двоеточий-перечислений внутри шага — это заголовки карточек;
8. callToAction — мягкое предложение обсудить проект через WhatsApp, Telegram или email.

Общие правила:
- отвечай только на русском;
- не используй сложный технический жаргон;
- не выдумывай статистику, клиентов, гарантии и результаты;
- не обещай конкретный рост прибыли;
- весь ответ должен быть полезным, а не рекламным текстом;
- верни только JSON по схеме, без markdown и без пояснений вне JSON.`;

const QUICK_SYSTEM_INSTRUCTIONS = `Ты — AI-консультант digital-студии AEVIX.

Тебе задают КОРОТКИЙ вопрос. Ответь коротко и конкретно: 1–3 предложения, без списков, без заголовков, без разделов, без воды. Не превращай ответ в доклад.

Цены AEVIX (модель «основа + возможности + каналы»):
${productPriceContext()}

Правила:
- ${FIRST_PROJECT_DISCOUNT_LINE}. Если вопрос про цену, стоимость или скидки — обязательно назови её;
- если передан контекст бизнеса (businessContext) — отвечай применительно именно к нему, используй его детали, а не общие фразы, и не переспрашивай нишу заново;
- если честный ответ — «не нужно» или «пока рано» — так и скажи, не предлагай услугу только потому, что она есть в прайсе;
- если для точного ответа нужен расчёт — коротко предложи открыть калькулятор или получить бесплатную консультацию;
- цену называй как «от N ₸», не выдумывай гарантии, сроки, статистику и результаты;
- отвечай только на русском;
- верни только JSON по схеме {answer}, без markdown.`;

const ESTIMATE_SYSTEM_INSTRUCTIONS = `Ты — AI-консультант digital-студии AEVIX.

Твоя задача — подготовить предварительный план проекта по бизнес-контексту и выбранным модулям.

Правила:
- отвечай только на русском;
- не используй технический жаргон;
- не выдумывай гарантии, сроки, клиентов, проценты, финансовый результат или рост прибыли;
- не называй расчет окончательной офертой;
- используй переданный диапазон стоимости как ориентир и не меняй его произвольно;
- контактные данные пользователя тебе не передаются и не нужны;
- верни только JSON по схеме, без markdown и без пояснений вне JSON.`;

const BUSINESS_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["shortAnswer", "reasons", "recommendedSolution", "summary", "problems", "recommendations", "flow", "callToAction"],
  properties: {
    shortAnswer: {
      type: "string",
      description: "Прямой ответ на вопрос/ситуацию пользователя, 2-5 предложений. Должен быть понятен за 5 секунд.",
    },
    reasons: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
      description: "Короткие причины вывода, каждая опирается на то, что написал пользователь.",
    },
    recommendedSolution: {
      type: "string",
      description: "Одно ясно сформулированное рекомендованное решение — следующий практический шаг.",
    },
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

const QUICK_ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer"],
  properties: {
    answer: {
      type: "string",
      description: "Короткий ответ на вопрос: 1–3 предложения, без списков и разделов.",
    },
  },
};

const PERSONAL_ESTIMATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "recommendedModules", "estimatedRange", "implementationSteps", "risks", "callToAction"],
  properties: {
    summary: { type: "string" },
    recommendedModules: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      items: { type: "string" },
    },
    estimatedRange: { type: "string" },
    implementationSteps: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
    risks: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    callToAction: { type: "string" },
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

  if (typeof candidate.shortAnswer !== "string" || !candidate.shortAnswer.trim()) return null;
  if (!isStringArray(candidate.reasons, 3, 5)) return null;
  if (typeof candidate.recommendedSolution !== "string" || !candidate.recommendedSolution.trim()) return null;
  if (typeof candidate.summary !== "string" || !candidate.summary.trim()) return null;
  if (!isStringArray(candidate.problems, 1, 4)) return null;
  if (!isStringArray(candidate.recommendations, 3, 6)) return null;
  if (!isStringArray(candidate.flow, 4, 7)) return null;
  if (typeof candidate.callToAction !== "string" || !candidate.callToAction.trim()) return null;

  const reasons = candidate.reasons as string[];
  const problems = candidate.problems as string[];
  const recommendations = candidate.recommendations as string[];
  const flow = candidate.flow as string[];

  return {
    shortAnswer: candidate.shortAnswer.trim(),
    reasons: reasons.map((item) => item.trim()),
    recommendedSolution: candidate.recommendedSolution.trim(),
    summary: candidate.summary.trim(),
    problems: problems.map((item) => item.trim()),
    recommendations: recommendations.map((item) => item.trim()),
    flow: flow.map((item) => item.trim()),
    callToAction: candidate.callToAction.trim(),
  };
}

function validateEstimateContext(value: unknown): EstimateContext | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<EstimateContext>;

  if (typeof candidate.businessType !== "string" || !candidate.businessType.trim()) return null;
  if (!isStringArray(candidate.selectedServices, 1, 7)) return null;
  if (typeof candidate.branchCount !== "string" || !candidate.branchCount.trim()) return null;
  if (typeof candidate.manualWork !== "string" || candidate.manualWork.trim().length > 900) return null;
  if (typeof candidate.currentServices !== "string" || candidate.currentServices.trim().length > 900) return null;
  if (typeof candidate.localRange !== "string" || !candidate.localRange.trim()) return null;

  const selectedServices = candidate.selectedServices as string[];

  return {
    businessType: candidate.businessType.trim().slice(0, 80),
    selectedServices: selectedServices.map((item) => item.trim().slice(0, 80)),
    branchCount: candidate.branchCount.trim().slice(0, 40),
    manualWork: candidate.manualWork.trim(),
    currentServices: candidate.currentServices.trim(),
    localRange: candidate.localRange.trim().slice(0, 120),
  };
}

function validateEstimate(value: unknown): PersonalEstimate | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<PersonalEstimate>;

  if (typeof candidate.summary !== "string" || !candidate.summary.trim()) return null;
  if (!isStringArray(candidate.recommendedModules, 1, 7)) return null;
  if (typeof candidate.estimatedRange !== "string" || !candidate.estimatedRange.trim()) return null;
  if (!isStringArray(candidate.implementationSteps, 3, 6)) return null;
  if (!isStringArray(candidate.risks, 1, 5)) return null;
  if (typeof candidate.callToAction !== "string" || !candidate.callToAction.trim()) return null;

  return {
    summary: candidate.summary.trim(),
    recommendedModules: (candidate.recommendedModules as string[]).map((item) => item.trim()),
    estimatedRange: candidate.estimatedRange.trim(),
    implementationSteps: (candidate.implementationSteps as string[]).map((item) => item.trim()),
    risks: (candidate.risks as string[]).map((item) => item.trim()),
    callToAction: candidate.callToAction.trim(),
  };
}

function toReadableAnalysis(analysis: BusinessAnalysis) {
  return [
    analysis.shortAnswer,
    analysis.recommendedSolution,
    `Что можно улучшить: ${analysis.problems.join("; ")}.`,
    `Подходящие решения: ${analysis.recommendations.join("; ")}.`,
    analysis.callToAction,
  ].join("\n\n");
}

export async function POST(request: Request) {
  const body = await parseRequestBody(request);
  const estimateContext = validateEstimateContext(body?.estimateContext);

  if (estimateContext) {
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
          instructions: ESTIMATE_SYSTEM_INSTRUCTIONS,
          input: JSON.stringify(estimateContext),
          max_output_tokens: 850,
          text: {
            format: {
              type: "json_schema",
              name: "aevix_personal_estimate",
              strict: true,
              schema: PERSONAL_ESTIMATE_SCHEMA,
            },
            verbosity: "medium",
          },
        },
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      const rawEstimate = response.output_text?.trim();

      if (!rawEstimate) {
        return NextResponse.json(
          { error: "AI-консультант не смог подготовить персональный расчет." },
          { status: 502 },
        );
      }

      const parsed = validateEstimate(JSON.parse(rawEstimate));

      if (!parsed) {
        return NextResponse.json(
          { error: "AI-консультант подготовил расчет в неверном формате. Попробуйте еще раз." },
          { status: 502 },
        );
      }

      return NextResponse.json({
        estimate: {
          ...parsed,
          estimatedRange: estimateContext.localRange,
        },
      });
    } catch {
      console.error("Personal estimate failed");

      return NextResponse.json(
        { error: "Не удалось подготовить AI-рекомендацию. Используйте локальный расчет." },
        { status: 502 },
      );
    }
  }

  const quickQuestionRaw = body?.quickQuestion;
  if (typeof quickQuestionRaw === "string" && quickQuestionRaw.trim()) {
    const quickQuestion = quickQuestionRaw.trim().slice(0, 500);
    const businessContextRaw = body?.businessContext;
    const businessContext =
      typeof businessContextRaw === "string" ? businessContextRaw.trim().slice(0, 400) : "";

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
          instructions: QUICK_SYSTEM_INSTRUCTIONS,
          input: JSON.stringify({ question: quickQuestion, businessContext: businessContext || null }),
          max_output_tokens: 320,
          text: {
            format: {
              type: "json_schema",
              name: "aevix_quick_answer",
              strict: true,
              schema: QUICK_ANSWER_SCHEMA,
            },
            verbosity: "medium",
          },
        },
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      const rawAnswer = response.output_text?.trim();
      if (!rawAnswer) {
        return NextResponse.json({ error: "AI-консультант не смог ответить." }, { status: 502 });
      }

      const parsed = JSON.parse(rawAnswer) as { answer?: unknown };
      const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
      if (!answer) {
        return NextResponse.json({ error: "AI-консультант вернул пустой ответ." }, { status: 502 });
      }

      return NextResponse.json({ answer });
    } catch {
      console.error("Quick answer failed");
      return NextResponse.json(
        { error: "Не удалось получить ответ. Попробуйте еще раз немного позже." },
        { status: 502 },
      );
    }
  }

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
        max_output_tokens: 1150,
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
