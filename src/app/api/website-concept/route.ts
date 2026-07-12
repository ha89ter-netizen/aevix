import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  buildFallbackWebsiteConcept,
  type ConceptSectionType,
  validateWebsiteConcept,
  validateWebsiteConceptInput,
  WEBSITE_CONCEPT_SCHEMA,
} from "@/lib/website-concept";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 4;
const REQUEST_TIMEOUT_MS = 24_000;
const MAX_REQUEST_BYTES = 10_000;

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

const SYSTEM_INSTRUCTIONS = `Ты — арт-директор digital-студии AEVIX.

Создай безопасную структурированную концепцию сайта на русском языке по переданному описанию бизнеса.

Правила:
- возвращай только JSON по заданной схеме;
- не генерируй HTML, React, JavaScript, CSS, markdown или исполняемый код;
- используй только template и type из разрешенных значений схемы;
- не выдумывай клиентов, отзывы, награды, статистику, гарантии, сроки или финансовые результаты;
- не придумывай конкретные цены бизнеса: используй нейтральные названия форматов;
- создай короткий, естественный и премиальный текст без технического жаргона;
- сохрани указанное название и тип бизнеса;
- palette должна содержать только HEX-цвета формата #RRGGBB;
- создай от 2 до 3 связанных страниц, первая страница всегда имеет id home;
- navigation должна содержать ровно по одному пункту для каждой страницы;
- названия страниц адаптируй под бизнес: услуги, меню, каталог, запись или контакты;
- каждая страница должна иметь короткий hero и от 1 до 5 содержательных секций;
- во всем сайте обязательно включи services, about, contacts и pricing либо booking;
- контактные данные пользователя не передаются и не нужны.`;

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

async function parseBody(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return { tooLarge: true, value: null };

  try {
    const text = await request.text();
    if (text.length > MAX_REQUEST_BYTES) return { tooLarge: true, value: null };
    return { tooLarge: false, value: JSON.parse(text) as unknown };
  } catch {
    return { tooLarge: false, value: null };
  }
}

export async function POST(request: Request) {
  const body = await parseBody(request);
  if (body.tooLarge) {
    return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });
  }

  const input = validateWebsiteConceptInput(body.value);
  if (!input) {
    return NextResponse.json(
      { error: "Проверьте название бизнеса и выбранные параметры концепта." },
      { status: 400 },
    );
  }

  if (isRateLimited(getClientId(request))) {
    return NextResponse.json(
      { error: "Слишком много запросов подряд. Подождите минуту и попробуйте снова." },
      { status: 429 },
    );
  }

  const fallback = buildFallbackWebsiteConcept(input);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      concept: fallback,
      source: "fallback",
      notice: "OpenAI временно недоступен. Показан локальный концепт AEVIX.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create(
      {
        model: "gpt-4.1-mini",
        instructions: SYSTEM_INSTRUCTIONS,
        input: JSON.stringify(input),
        max_output_tokens: 2600,
        text: {
          format: {
            type: "json_schema",
            name: "aevix_website_concept",
            strict: true,
            schema: WEBSITE_CONCEPT_SCHEMA,
          },
          verbosity: "medium",
        },
      },
      { signal: controller.signal },
    );

    const rawConcept = response.output_text?.trim();
    const concept = rawConcept ? validateWebsiteConcept(JSON.parse(rawConcept)) : null;

    if (!concept) {
      return NextResponse.json({
        concept: fallback,
        source: "fallback",
        notice: "AI вернул неподдерживаемую структуру. Показан безопасный локальный концепт.",
      });
    }

    const generatedTypes = new Set(concept.pages.flatMap((page) => page.sections.map((section) => section.type)));
    const requiredTypes: ConceptSectionType[] = [
      "services",
      "about",
      "contacts",
      input.goals.includes("Записывать клиентов") ? "booking" : "pricing",
    ];
    if (requiredTypes.some((type) => !generatedTypes.has(type))) {
      return NextResponse.json({
        concept: fallback,
        source: "fallback",
        notice: "AI вернул неполную структуру страниц. Показан безопасный локальный концепт.",
      });
    }

    return NextResponse.json({
      concept,
      source: "ai",
    });
  } catch {
    console.error("Website concept generation failed");
    return NextResponse.json({
      concept: fallback,
      source: "fallback",
      notice: "Не удалось получить AI-концепт. Показан локальный вариант AEVIX.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
