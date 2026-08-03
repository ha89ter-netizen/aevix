import OpenAI from "openai";
import { NextResponse } from "next/server";
import { businessKnowledgeFor, type BusinessKnowledge } from "@/lib/business-knowledge";
import {
  buildFallbackWebsiteConcept,
  resolveConceptLayout,
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

// See the identical note in api/business-analysis/route.ts: per-instance only, not a hard cap.
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

const SYSTEM_INSTRUCTIONS = `Ты — арт-директор digital-студии AEVIX.

Создай безопасную структурированную концепцию сайта на русском языке по переданному описанию бизнеса.

Правила:
- возвращай только JSON по заданной схеме;
- не генерируй HTML, React, JavaScript, CSS, markdown или исполняемый код;
- используй только type страниц и секций из разрешенных значений схемы;
- не выдумывай клиентов, отзывы, награды, статистику, гарантии, сроки или финансовые результаты;
- не придумывай конкретные цены бизнеса: используй нейтральные названия форматов;
- создай короткий, естественный и премиальный текст без технического жаргона — избегай шаблонных AI-фраз;
- сохрани указанное название и тип бизнеса;
- создай от 3 до 4 связанных страниц, первая страница всегда имеет id home;
- navigation должна содержать ровно по одному пункту для каждой страницы;
- каждая страница должна иметь короткий hero и от 1 до 5 содержательных секций;
- НИКОГДА не повторяй один и тот же контент на разных страницах: каждая секция каждой страницы несёт свой смысл; главная только анонсирует то, что подробно раскрыто на внутренних страницах;
- различай продукты и услуги: продукты — это то, что бизнес продаёт (меню, каталог, номера), услуги — то, что он делает для клиента (доставка, запись, сервис); у бизнеса без продуктов нет страницы «Меню» или «Каталог»;
- во всем сайте обязательно включи services, about, contacts и pricing либо booking;
- контактные данные пользователя не передаются и не нужны.`;

/**
 * The generator loads the niche's knowledge FIRST and generates on top of it: recommended page
 * structure, the products-vs-services split with real category offerings, and the About angle.
 * This digest is what turns "a universal website" into "a coffee-shop website".
 */
function knowledgeDigest(knowledge: BusinessKnowledge): string {
  const products = knowledge.products.slice(0, 12).map((offer) => offer.name);
  const services = knowledge.services.slice(0, 10).map((offer) => offer.name);
  const pages = [
    "home («Главная» — анонс, не дубли)",
    knowledge.productsPageName
      ? `страница «${knowledge.productsPageName}» (продукты: pricing-секция с полным ассортиментом)`
      : "страница «Услуги» (pricing-секция с полным списком услуг)",
    "страница «О нас» (история, ценности, команда — about-секция)",
    "страница контактов или записи (contacts, при записи — booking, плюс faq)",
  ];
  return `Знания о нише «${knowledge.label}»:
- рекомендованная структура страниц: ${pages.join("; ")};
- ${knowledge.productsPageName ? `продукты (страница «${knowledge.productsPageName}»): ${products.join(", ")}` : "продуктов нет — только услуги, страница «Меню»/«Каталог» не нужна"};
- услуги/сервис: ${services.join(", ")};
- уместные призывы к действию: «${knowledge.ctas.primary}», «${knowledge.ctas.secondary}», «${knowledge.ctas.final}»;
- угол подачи «О нас»: ${knowledge.about.mission}`;
}

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

  // Load the niche knowledge BEFORE generating — the model builds on category structure
  // instead of inventing the niche from scratch each time.
  const knowledge = businessKnowledgeFor(input.businessType, input.businessName);

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create(
      {
        model: "gpt-4.1-mini",
        instructions: `${SYSTEM_INSTRUCTIONS}\n\n${knowledgeDigest(knowledge)}`,
        input: JSON.stringify(input),
        max_output_tokens: 3800,
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
    const content = rawConcept ? validateWebsiteConcept(JSON.parse(rawConcept)) : null;

    if (!content) {
      return NextResponse.json({
        concept: fallback,
        source: "fallback",
        notice: "AI вернул неподдерживаемую структуру. Показан безопасный локальный концепт.",
      });
    }

    // Visual identity (color + style + layout) always comes from our own side, never from the
    // model — this guarantees a consistent, always-valid identity regardless of what the AI did.
    const concept = {
      ...content,
      colorIds: input.colorIds,
      styleId: input.styleId,
      layoutId: resolveConceptLayout({ businessType: input.businessType, businessName: input.businessName }),
    };

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
  } catch (err) {
    // Статус и текст ошибки OpenAI пишутся в лог (ключ в них уже маскирован самим
    // OpenAI). Без этого «неверный ключ» выглядит для пользователя как «сеть недоступна»,
    // и настоящая причина не сохраняется нигде.
    console.error("Website concept generation failed:", (err as { status?: number }).status, (err as Error).message?.slice(0, 300));
    return NextResponse.json({
      concept: fallback,
      source: "fallback",
      notice: "Не удалось получить AI-концепт. Показан локальный вариант AEVIX.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
