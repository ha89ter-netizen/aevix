import type { AnalysisResult, EstimateForm, EstimateResult } from "@/components/site-experience";
import { buildFallbackEstimate } from "@/components/site-experience";
import { businessKnowledgeFor } from "./business-knowledge";
import {
  buildFallbackWebsiteConcept,
  resolveConceptLayout,
  type ConceptColorId,
  type ConceptGoal,
  type ConceptSectionType,
  type ConceptStyleId,
  type WebsiteConcept,
  type WebsiteConceptInput,
} from "./website-concept";

/**
 * Everything a new project needs, produced in one pass the moment it is created.
 *
 * Creating a project used to hand back an empty workspace with a row of "generate this" buttons,
 * which put the assembly work back on the person who had just described their business. The AI
 * now does that work up front, so the first thing they see is a finished project.
 *
 * The stage labels below are honest: each one is emitted when that step actually STARTS, and the
 * next one only appears when the previous step has really finished. Nothing is padded to look
 * busy — if the concept comes back in 300ms, the run moves on in 300ms. And each label marks a
 * boundary that really exists: the two network waits, then the synchronous assembly.
 */

/**
 * Фазы генерации — ровно те границы, которые система действительно может наблюдать.
 *
 * Было восемь подписей, из которых время занимали ДВЕ: `analyze` и `structure` — единственные
 * два сетевых шага. Остальные шесть синхронные и проскакивали одним кадром в самом конце. На
 * замере это выглядело так: активная строка менялась дважды за 16–50 секунд, а потом шесть
 * галочек ставились разом. Список честно перечислял, что делает код, но врал о том, сколько это
 * стоит по времени, — восемь пунктов обещают равномерное движение, которого нет.
 *
 * Теперь фаз три, и каждая — настоящая граница: два ожидания ответа и сборка проекта из уже
 * полученного. Ни процентов, ни искусственных задержек: если концепт вернётся за 300мс, фаза
 * закончится за 300мс.
 */
export type GenerationStageId = "analyze" | "concept" | "assemble";

export const generationStages: Array<{ id: GenerationStageId; label: string; hint: string }> = [
  { id: "analyze", label: "Разбираем бизнес", hint: "AI читает описание и собирает разбор" },
  { id: "concept", label: "Собираем сайт", hint: "AI пишет структуру и тексты страниц" },
  { id: "assemble", label: "Готовим рабочее пространство", hint: "Связываем разбор, сайт, процесс и расчёт" },
];

export type ProjectBrief = {
  name: string;
  businessType: string;
  city: string;
  description: string;
  styleIds: ConceptStyleId[];
  colorIds: ConceptColorId[];
  /** Пустые массивы — проект, созданный до того, как об этом начали спрашивать. Умолчания ниже
   * ровно те, что подставлялись жёстко, поэтому такие проекты генерируются как прежде. */
  goals?: ConceptGoal[];
  /** Подтверждённая структура: типы разделов и названия, которые человек мог переписать. */
  sections?: Array<{ type: ConceptSectionType; title: string }>;
  wishes?: string;
};

/** Что подставить, когда бриф старый и задачи в нём нет. Ровно прежнее зашитое поведение. */
const DEFAULT_GOALS: ConceptGoal[] = ["Получать заявки"];
const DEFAULT_SECTIONS: ConceptSectionType[] = [
  "services",
  "pricing",
  "about",
  "gallery",
  "reviews",
  "booking",
  "contacts",
  "faq",
];

export type GeneratedProject = {
  analysis: AnalysisResult | null;
  design: WebsiteConcept | null;
  pricing: { form: EstimateForm; result: EstimateResult } | null;
};

/** Maps a free-text niche onto the pricing calculator's own business types. */
function estimateBusinessType(businessType: string): EstimateForm["businessType"] {
  const knowledge = businessKnowledgeFor(businessType, "");
  switch (knowledge.id) {
    case "barbershop":
      return "Барбершоп";
    case "beauty":
      return "Салон красоты";
    case "coffee":
    case "restaurant":
      return "Кофейня / ресторан";
    case "shop":
    case "perfume":
    case "flowers":
      return "Магазин";
    default:
      return "Другое";
  }
}

/** The modules a niche most obviously needs — the same set the roadmap already recommends. */
function recommendedServices(businessType: string, goals: ConceptGoal[]): EstimateForm["selectedServices"] {
  const knowledge = businessKnowledgeFor(businessType, "");
  const booking = ["barbershop", "beauty", "dental", "fitness", "restaurant", "auto", "hotel"];
  // Ниша подсказывает, но названная задача весомее: если человек прямо сказал «записывать
  // клиентов», модуль записи нужен, даже когда ниша обычно обходится без него.
  const needsBooking = booking.includes(knowledge.id) || goals.includes("Записывать клиентов");
  return needsBooking ? ["ai", "whatsapp", "site", "crm"] : ["ai", "whatsapp", "site"];
}

function buildEstimateForm(brief: ProjectBrief): EstimateForm {
  return {
    businessType: estimateBusinessType(brief.businessType),
    selectedServices: recommendedServices(brief.businessType, brief.goals ?? DEFAULT_GOALS),
    branchCount: "1",
    manualWork: brief.description,
    currentServices: "",
    contactName: "",
    contactHandle: "",
    contactEmail: "",
  };
}

function conceptInputFrom(brief: ProjectBrief): WebsiteConceptInput {
  const knowledge = businessKnowledgeFor(brief.businessType, brief.name);
  return {
    // Ниша идёт как есть — приведения типа здесь больше нет, схема концепта принимает строку.
    // Пустой она быть не может: у нераспознанного бизнеса берётся ярлык базы знаний, иначе
    // серверная проверка отвергла бы бриф, а человек получил бы локальный концепт молча.
    businessType: brief.businessType || knowledge.label,
    businessName: brief.name,
    styleIds: brief.styleIds,
    styleId: brief.styleIds[0] ?? knowledge.styles[0] ?? "minimal",
    // Выбор человека всегда главнее. Без выбора берём палитру ниши, а не общий чёрно-золотой:
    // он одинаково красил салон красоты, стоматологию и автосервис.
    colorIds: brief.colorIds.length ? brief.colorIds : knowledge.colors,
    customColors: "",
    // Задача идёт из брифа, а не подставляется: от неё зависит, потребует ли маршрут концепта
    // секцию записи или секцию цен, то есть под что вообще строится сайт.
    // Город — то, что человек назвал в брифе. Без него отрисовка контактов подставляла
    // демонстрационный адрес ниши, а он всегда алматинский.
    city: brief.city,
    goals: brief.goals?.length ? brief.goals : DEFAULT_GOALS,
    sections: brief.sections?.length ? brief.sections.map((section) => section.type) : DEFAULT_SECTIONS,
    // Названия разделов уходят вместе с типами: без них «переименовать» в мастере было бы
    // украшением — правка не дошла бы до сайта.
    sectionTitles: brief.sections?.length
      ? Object.fromEntries(brief.sections.map((section) => [section.type, section.title]))
      : undefined,
    // Пожелания и описание — разные вещи: первое про характер сайта, второе про бизнес. Пока
    // спрашивали только описание, оно шло и туда; теперь склеиваем, если есть оба.
    wishes: [brief.wishes, brief.description].filter(Boolean).join(". "),
  } as WebsiteConceptInput;
}

/**
 * A complete analysis derived from the niche knowledge base. The AI route returns 503 when no
 * server key is configured and has no local path of its own, so without this a freshly created
 * project would open with two of its four sections empty — the exact "assemble it yourself"
 * experience this flow exists to remove. The AI result is still preferred whenever it arrives.
 */
function buildFallbackAnalysis(brief: ProjectBrief): AnalysisResult {
  const knowledge = businessKnowledgeFor(brief.businessType, brief.name);
  const niche = knowledge.label.toLowerCase();
  const where = brief.city ? ` в городе ${brief.city}` : "";
  return {
    shortAnswer: `Да, ${niche}${where} выиграет от автоматизации обращений и записи.`,
    reasons: [
      "Обращения приходят в разные каналы и обрабатываются вручную.",
      "Часть заявок теряется в часы наибольшей нагрузки.",
      "Владелец не видит полную картину потока клиентов.",
    ],
    recommendedSolution: "AI-консультант принимает обращения, фиксирует заявку и передаёт её команде с полным контекстом.",
    summary: brief.description
      ? brief.description.slice(0, 240)
      : `${knowledge.label}${where}: ${knowledge.about.mission}`,
    problems: [
      "Ручная обработка входящих сообщений.",
      "Нет единой очереди обращений.",
      "Решения принимаются без данных о потоке.",
    ],
    recommendations: [
      "Подключить AI-ответы в основных каналах.",
      "Собрать обращения в один рабочий поток.",
      "Добавить напоминания и статусы по каждой заявке.",
    ],
    flow: ["Клиент пишет", "AI отвечает", "Заявка зафиксирована", "Команда подтверждает", "Напоминание"],
    callToAction: knowledge.ctas.final,
  };
}

async function fetchAnalysis(brief: ProjectBrief, signal: AbortSignal): Promise<AnalysisResult | null> {
  const message = [brief.name, brief.businessType, brief.city, brief.description].filter(Boolean).join(", ");
  try {
    const response = await fetch("/api/business-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal,
    });
    const data = (await response.json()) as { result?: AnalysisResult };
    // A 503 (no server key) or any malformed payload falls back to the local analysis rather
    // than leaving the project short of a section.
    return data.result ?? buildFallbackAnalysis(brief);
  } catch {
    return buildFallbackAnalysis(brief);
  }
}

async function fetchConcept(brief: ProjectBrief, signal: AbortSignal): Promise<WebsiteConcept> {
  const input = conceptInputFrom(brief);
  try {
    const response = await fetch("/api/website-concept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    const data = (await response.json()) as { concept?: WebsiteConcept };
    if (data.concept) return data.concept;
  } catch {
    // fall through to the local generator
  }
  return buildFallbackWebsiteConcept(input);
}

/**
 * Runs the whole pipeline. `onStage` fires as each step begins, so the progress screen reflects
 * genuine progress rather than a timer.
 */
export async function runProjectGeneration(
  brief: ProjectBrief,
  onStage: (id: GenerationStageId) => void,
  signal: AbortSignal,
): Promise<GeneratedProject> {
  // Фаза 1 — единственное сетевое ожидание разбора.
  onStage("analyze");
  const analysis = (await fetchAnalysis(brief, signal)) ?? buildFallbackAnalysis(brief);

  // Фаза 2 — второе и последнее сетевое ожидание.
  onStage("concept");
  const knowledge = businessKnowledgeFor(brief.businessType, brief.name);
  const concept = await fetchConcept(brief, signal);

  // Фаза 3 — всё дальнейшее синхронно: связываем полученное с личностью проекта и считаем
  // стоимость локально. Отдельных подписей у этих шагов больше нет — они не занимают времени,
  // и объявлять их этапами значило бы обещать движение там, где его нет.
  onStage("assemble");
  // The concept response already carries copy for every page; this step is where it is bound to
  // the project's own identity rather than the generator's defaults.
  const design: WebsiteConcept = {
    ...concept,
    businessName: brief.name,
    businessType: brief.businessType || knowledge.label,
    colorIds: brief.colorIds.length ? brief.colorIds : concept.colorIds,
    styleId: brief.styleIds[0] ?? concept.styleId,
    layoutId: resolveConceptLayout({ businessType: brief.businessType, businessName: brief.name }),
    // Город с брифа, а не из ответа маршрута: даже если концепт пришёл по запасному пути или
    // от модели, названный человеком город остаётся главнее.
    city: brief.city || concept.city,
    // Copied out of the knowledge base and onto the project, so the price list becomes editable.
    offers: concept.offers ?? { products: [...knowledge.products], services: [...knowledge.services] },
  };

  const form = buildEstimateForm(brief);
  const pricing = { form, result: buildFallbackEstimate(form) };

  return { analysis, design, pricing };
}
