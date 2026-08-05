import OpenAI from "openai";
import { NextResponse } from "next/server";
import { businessKnowledgeFor, type BusinessKnowledge } from "@/lib/business-knowledge";
import {
  buildFallbackWebsiteConcept,
  dedupeConceptSections,
  resolveConceptLayout,
  type ConceptSectionType,
  validateWebsiteConcept,
  validateWebsiteConceptInput,
  WEBSITE_CONCEPT_SCHEMA,
} from "@/lib/website-concept";

export const runtime = "nodejs";
/**
 * Задано явно, потому что теперь маршрут может делать до трёх запросов к модели подряд.
 * Значение по умолчанию у Vercel меньше суммарного бюджета попыток, и функцию оборвало бы
 * посреди второй — то есть повторы существовали бы только на localhost.
 */
export const maxDuration = 60;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 4;
const MAX_REQUEST_BYTES = 10_000;

/**
 * Повторы генерации концепта.
 *
 * Измерено на живых запросах: модель проходила собственную проверку маршрута примерно в
 * половине случаев — три ответа из шести приходили без одной из обязательных секций, и человек
 * молча получал локальный концепт вместо AI. Свойство «никогда не пусто» при этом работало
 * безупречно, а потому и скрывало проблему.
 *
 * Повтор здесь не слепой: следующей попытке прямо сообщается, каких секций не хватило (см.
 * `retryHint`). Повторять тот же запрос теми же словами — надеяться на удачу; назвать
 * недостающее — дать модели то, чего ей не хватило.
 *
 * Что дали повторы на самом деле (то же измерение, шесть запросов): 4 успеха из 6 против 3 из
 * 6. Меньше, чем обещает арифметика независимых попыток, и по двум понятным причинам. Одна
 * попытка занимает 15–22 секунды, поэтому в бюджет реально укладываются две, а не три. И срывы
 * не независимы: на одном и том же описании бизнеса модель склонна упускать одну и ту же
 * секцию, так что вторая попытка — не второй бросок монеты, а тот же бросок с подсказкой.
 *
 * Потолок здесь — время. Уложить три попытки значит держать человека у экрана генерации около
 * минуты, что хуже локального концепта. Дальше эту долю поднимать надо не числом попыток.
 */
const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 22_000;
/** Общий потолок на все попытки, с запасом под maxDuration ниже. */
const TOTAL_BUDGET_MS = 50_000;

/** Повторяем только то, что бывает разовым. Неверный ключ и отвергнутый запрос — не бывают. */
function isWorthRetrying(status: number | undefined): boolean {
  // status отсутствует у обрыва соединения и у нашего же таймаута — это как раз повторяемое.
  if (status === undefined) return true;
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

/** Подсказка для повторной попытки: что именно не прошло проверку в прошлый раз. */
function retryHint(missing: ConceptSectionType[]): string {
  if (!missing.length) return "";
  return `\n\nВНИМАНИЕ: предыдущая попытка отклонена — во всём сайте не хватало обязательных секций: ${missing.join(", ")}. Обязательно включи их в этот раз.`;
}

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

  // Load the niche knowledge BEFORE generating — the model builds on category structure
  // instead of inventing the niche from scratch each time.
  const knowledge = businessKnowledgeFor(input.businessType, input.businessName);
  const client = new OpenAI({ apiKey });

  /**
   * Что маршрут обязан увидеть в ответе модели.
   *
   * Раньше этот набор был константой, и она перекрывала человека: раздел, убранный в мастере,
   * возвращался обратно, потому что ответ без него отбраковывался. «Структуру можно править»
   * оказывалось неправдой.
   *
   * Теперь берём пересечение с подтверждённой структурой. Убрал человек цены — их больше не
   * требуем. Оставил всё — требование ровно прежнее, поэтому доля успешных генераций не падает.
   */
  const coreTypes: ConceptSectionType[] = [
    "services",
    "about",
    "contacts",
    input.goals.includes("Записывать клиентов") ? "booking" : "pricing",
  ];
  const confirmed = new Set(input.sections);
  const requiredTypes = coreTypes.filter((type) => confirmed.has(type));

  const startedAt = Date.now();
  /** Чего не хватило в прошлой попытке — уходит в подсказку следующей. */
  let missingTypes: ConceptSectionType[] = [];
  let lastNotice = "Не удалось получить AI-концепт. Показан локальный вариант AEVIX.";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Следующая попытка начинается, только если на неё есть время: оборванный на середине
    // ответ — это те же деньги и та же задержка, но без результата.
    if (attempt > 1 && Date.now() - startedAt > TOTAL_BUDGET_MS - ATTEMPT_TIMEOUT_MS) break;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

    try {
      const response = await client.responses.create(
        {
          model: "gpt-4.1-mini",
          instructions: `${SYSTEM_INSTRUCTIONS}\n\n${knowledgeDigest(knowledge)}${retryHint(missingTypes)}`,
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
        lastNotice = "AI вернул неподдерживаемую структуру. Показан безопасный локальный концепт.";
        missingTypes = [];
        continue;
      }

      // Visual identity (color + style + layout) always comes from our own side, never from the
      // model — this guarantees a consistent, always-valid identity regardless of what the AI did.
      const raw = {
        ...content,
        colorIds: input.colorIds,
        styleId: input.styleId,
        layoutId: resolveConceptLayout({ businessType: input.businessType, businessName: input.businessName }),
        // Город берём из запроса, а не из ответа модели: это факт, названный человеком, и
        // выдумывать его модели незачем. Без него отрисовка контактов подставляла
        // демонстрационный адрес базы знаний — всегда алматинский.
        city: input.city,
      };

      // Чистим повторы ДО проверки полноты, а не после: иначе можно отдать концепт, который
      // проверку прошёл, а после чистки остался без обязательной секции. Модель наблюдалась с
      // двумя секциями одного типа на странице («О нас: about, about»).
      const concept = dedupeConceptSections(raw, knowledge.products.length > 0);

      const generatedTypes = new Set(concept.pages.flatMap((page) => page.sections.map((section) => section.type)));
      missingTypes = requiredTypes.filter((type) => !generatedTypes.has(type));

      if (missingTypes.length) {
        // Пишем, ЧЕГО именно не хватило. «Неполная структура» в логе не даёт понять, упирается
        // ли модель каждый раз в одну и ту же секцию (тогда чинить надо запрос) или срывается
        // вразнобой (тогда — требование маршрута).
        console.warn(
          `[website-concept] попытка ${attempt}: не хватило ${missingTypes.join(", ")}; получено: ${[...generatedTypes].join(", ")}`,
        );
        lastNotice = "AI вернул неполную структуру страниц. Показан безопасный локальный концепт.";
        continue;
      }

      if (attempt > 1) {
        console.warn(`[website-concept] AI-концепт получен с попытки ${attempt}`);
      }
      return NextResponse.json({ concept, source: "ai", attempts: attempt });
    } catch (err) {
      // Статус и текст ошибки OpenAI пишутся в лог (ключ в них уже маскирован самим
      // OpenAI). Без этого «неверный ключ» выглядит для пользователя как «сеть недоступна»,
      // и настоящая причина не сохраняется нигде.
      const status = (err as { status?: number }).status;
      console.error(`Website concept generation failed (попытка ${attempt}):`, status, (err as Error).message?.slice(0, 300));
      lastNotice = "Не удалось получить AI-концепт. Показан локальный вариант AEVIX.";
      // Неверный ключ или отвергнутый запрос повтором не лечатся — от повтора будет ровно та
      // же ошибка, только вдвое дольше. Повторяем лишь то, что бывает разовым: обрыв, таймаут,
      // перегрузку на стороне модели.
      if (!isWorthRetrying(status)) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  return NextResponse.json({ concept: fallback, source: "fallback", notice: lastNotice });
}
