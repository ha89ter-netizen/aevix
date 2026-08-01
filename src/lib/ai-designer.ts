import type { DesignerEntry, Project } from "./projects";
import { businessKnowledgeFor } from "./business-knowledge";
import {
  conceptColors,
  conceptLayouts,
  conceptStyles,
  resolveConceptLayout,
  type ConceptColorId,
  type ConceptStyleId,
  type WebsiteConcept,
} from "./website-concept";

/**
 * The AI Designer's brain.
 *
 * It is deliberately NOT a chat model wrapper. A request is resolved to a concrete, bounded edit
 * on the project's own concept — the darkness of the palette, the visual style, the layout, a
 * section being added or removed — and applied directly. The panel then reports what changed,
 * not what it "thinks". The evolving project is the output; the conversation is a receipt.
 *
 * Every edit is scoped: asking for a darker hero rewrites the palette, never the copy, the
 * pricing or the analysis. Rebuilding everything is reserved for an explicit request.
 */

export type DesignerIntentId =
  | "darker"
  | "lighter"
  | "style"
  | "layout"
  | "add-section"
  | "remove-section"
  | "typography"
  // Content edits. These change what the site SAYS, not how it looks — the requests people
  // actually make most often, and the ones the design-only intents above could never serve.
  | "edit-heading"
  | "edit-text"
  | "edit-price"
  | "remove-offer"
  | "unknown";

/** A resolved request: the intent plus whatever the phrasing carried with it. */
export type ResolvedIntent = {
  id: DesignerIntentId;
  /** Style/layout/section id for design intents. */
  value?: string;
  /** The offer or section the edit names, e.g. "Капучино". */
  target?: string;
  /** Replacement copy or price. */
  text?: string;
};

export type DesignerStep = { label: string };

export type DesignerOutcome = {
  intent: DesignerIntentId;
  /** The part of the project this edit landed on. */
  section: string;
  /** Live progress lines shown while the edit is applied — one per real change. */
  steps: DesignerStep[];
  /** What actually changed, for the project's memory and the panel's change list. */
  changes: string[];
  /** The next improvement that genuinely follows from this one, or null when there isn't one. */
  suggestion: DesignerSuggestion | null;
  /** The edited concept, or null when nothing could be applied. */
  design: WebsiteConcept | null;
};

export type DesignerSuggestion = {
  text: string;
  /** Applying it runs this follow-up request through the same pipeline. */
  request: string;
};

const DARK_COLORS: ConceptColorId[] = ["black", "navy", "burgundy"];

function has(text: string, ...words: string[]) {
  return words.some((word) => text.includes(word));
}

/**
 * The fast path: phrasings we can resolve locally, with no network and no ambiguity. Anything
 * this cannot place returns `unknown`, and the panel then asks the model (see
 * /api/designer-intent) rather than telling the person their wording was wrong.
 */
export function resolveIntent(request: string): ResolvedIntent {
  const text = request.toLowerCase();

  // Content edits are checked first: "поменяй цену на 900" also contains no design keyword, but
  // "сделай заголовок темнее" must not be read as a heading edit.
  const priceMatch = /(?:цен[уаы]|стоимость)[^0-9]*([0-9][0-9\s]{2,})/i.exec(request);
  if (priceMatch && !has(text, "темн", "светл")) {
    const target = /[«"]([^»"]+)[»"]/.exec(request)?.[1];
    return { id: "edit-price", target, text: priceMatch[1].replace(/\s+/g, " ").trim() };
  }
  const headingMatch = /(?:заголов\w*|титул\w*)[^«"]*[«"]([^»"]+)[»"]/i.exec(request);
  if (headingMatch) return { id: "edit-heading", text: headingMatch[1] };
  const textMatch = /(?:текст|описани\w*|подзаголов\w*)[^«"]*[«"]([^»"]+)[»"]/i.exec(request);
  if (textMatch) return { id: "edit-text", text: textMatch[1] };
  if (has(text, "убер", "удал", "remove")) {
    const target = /[«"]([^»"]+)[»"]/.exec(request)?.[1];
    if (target) return { id: "remove-offer", target };
  }

  if (has(text, "темн", "тёмн", "dark", "мрачн", "контраст")) return { id: "darker" };
  if (has(text, "светл", "light", "воздуш", "ярче")) return { id: "lighter" };
  if (has(text, "шрифт", "типограф", "заголов", "typography")) return { id: "typography" };
  if (has(text, "макет", "layout", "композиц", "структур")) return { id: "layout" };

  const style = conceptStyles.find((item) => text.includes(item.label.toLowerCase()) || text.includes(item.id));
  if (style) return { id: "style", value: style.id };

  if (has(text, "добав", "add")) {
    if (has(text, "отзыв", "testimonial", "review")) return { id: "add-section", value: "reviews" };
    if (has(text, "faq", "вопрос")) return { id: "add-section", value: "faq" };
    if (has(text, "галере", "фото", "gallery")) return { id: "add-section", value: "gallery" };
  }
  if (has(text, "убер", "удал", "remove", "без ")) {
    if (has(text, "отзыв", "review")) return { id: "remove-section", value: "reviews" };
    if (has(text, "faq", "вопрос")) return { id: "remove-section", value: "faq" };
    if (has(text, "галере", "gallery")) return { id: "remove-section", value: "gallery" };
  }
  return { id: "unknown" };
}

/**
 * Picks the follow-up worth offering. Returns null far more often than not — a designer who
 * suggests something after every single edit is noise, and the recommendation stops meaning
 * anything. It only fires when the change just made leaves a real inconsistency behind, and
 * never repeats advice the project's history shows was already given.
 */
function suggestNext(
  intent: DesignerIntentId,
  project: Project,
  design: WebsiteConcept,
): DesignerSuggestion | null {
  const alreadySuggested = (fragment: string) =>
    project.designerLog.some((entry) => entry.suggestion?.toLowerCase().includes(fragment));

  if (intent === "darker") {
    const layout = resolveConceptLayout(design);
    if (layout !== "showcase" && !alreadySuggested("макет")) {
      return {
        text: "Hero стал заметно премиальнее. Чтобы стиль читался целостно, стоит перевести макет на «Витрину» — крупный кадр во всю ширину поддержит тёмную палитру.",
        request: "Смени макет на витрину",
      };
    }
    // Already a showcase layout: the remaining inconsistency after a palette shift is the type,
    // which still carries the lighter design's weight.
    if (!alreadySuggested("типограф")) {
      return {
        text: "Тёмная палитра применена. Чтобы карточки услуг и навигация не выпадали из нового настроения, стоит усилить типографику под более контрастный фон.",
        request: "Улучши типографику",
      };
    }
  }
  if (intent === "style" && !alreadySuggested("отзыв")) {
    const hasReviews = design.pages.some((page) => page.sections.some((section) => section.type === "reviews"));
    if (!hasReviews) {
      return {
        text: "Новый стиль требует доверия рядом с ценой. Блок отзывов на главной закроет этот разрыв.",
        request: "Добавь отзывы",
      };
    }
  }
  if (intent === "add-section" && !alreadySuggested("типограф")) {
    return {
      text: "Секций стало больше — плотный набор начнёт спорить с заголовками. Предлагаю усилить типографику, чтобы иерархия осталась читаемой.",
      request: "Улучши типографику",
    };
  }
  return null;
}

/** Applies one bounded edit to the project's concept. An already-resolved intent can be passed
 * in when the model did the reading (see the panel's fallback path). */
export function applyDesignerRequest(
  request: string,
  project: Project,
  resolved?: ResolvedIntent,
): DesignerOutcome {
  const design = project.design;
  const intent = resolved ?? resolveIntent(request);
  if (!design) {
    return {
      intent: intent.id,
      section: "—",
      steps: [],
      changes: [],
      suggestion: null,
      design: null,
    };
  }

  const knowledge = businessKnowledgeFor(project.businessType, project.name);
  let next: WebsiteConcept = { ...design };
  const steps: DesignerStep[] = [];
  const changes: string[] = [];

  switch (intent.id) {
    case "darker": {
      steps.push({ label: "Обновляем Hero" }, { label: "Пересобираем палитру" }, { label: "Синхронизируем компоненты" });
      const dark = DARK_COLORS.find((id) => !design.colorIds.includes(id)) ?? "black";
      next = { ...next, colorIds: [dark, ...design.colorIds.filter((id) => !DARK_COLORS.includes(id))].slice(0, 4) };
      changes.push("Палитра переведена в тёмную гамму", "Hero и акценты пересчитаны");
      break;
    }
    case "lighter": {
      steps.push({ label: "Осветляем фон" }, { label: "Пересчитываем контраст" });
      const light = design.colorIds.filter((id) => !DARK_COLORS.includes(id));
      next = { ...next, colorIds: light.length ? light : ["white", "blue"] };
      changes.push("Палитра переведена в светлую гамму");
      break;
    }
    case "style": {
      const styleId = (intent.value ?? "minimal") as ConceptStyleId;
      const label = conceptStyles.find((item) => item.id === styleId)?.label ?? styleId;
      steps.push({ label: `Применяем стиль «${label}»` }, { label: "Обновляем компоненты" });
      next = { ...next, styleId };
      changes.push(`Визуальный стиль: ${label}`);
      break;
    }
    case "layout": {
      const current = resolveConceptLayout(design);
      const target = request.toLowerCase().includes("витрин")
        ? "showcase"
        : request.toLowerCase().includes("журнал")
          ? "editorial"
          : conceptLayouts[(conceptLayouts.findIndex((item) => item.id === current) + 1) % conceptLayouts.length].id;
      const label = conceptLayouts.find((item) => item.id === target)?.label ?? target;
      steps.push({ label: `Перестраиваем макет на «${label}»` }, { label: "Пересобираем сетку" });
      next = { ...next, layoutId: target };
      changes.push(`Макет: ${label}`);
      break;
    }
    case "typography": {
      const order: ConceptStyleId[] = ["editorial", "elegant", "premium", "bold"];
      const styleId = order.find((id) => id !== design.styleId) ?? "editorial";
      const label = conceptStyles.find((item) => item.id === styleId)?.label ?? styleId;
      steps.push({ label: "Усиливаем иерархию заголовков" }, { label: "Обновляем начертания" });
      next = { ...next, styleId };
      changes.push(`Типографика усилена (стиль «${label}»)`);
      break;
    }
    case "add-section": {
      const type = (intent.value ?? "reviews") as "reviews" | "faq" | "gallery";
      const titles = { reviews: "Что говорят клиенты", faq: "Частые вопросы", gallery: "Атмосфера" };
      steps.push({ label: `Добавляем блок «${titles[type]}»` }, { label: "Встраиваем в страницу" });
      const [home, ...rest] = next.pages;
      if (home && !home.sections.some((section) => section.type === type)) {
        next = {
          ...next,
          pages: [
            {
              ...home,
              sections: [
                ...home.sections,
                { type, title: titles[type], text: `Раздел добавлен AI-дизайнером для ${knowledge.label.toLowerCase()}.`, items: [] },
              ],
            },
            ...rest,
          ],
        };
        changes.push(`Добавлен блок «${titles[type]}»`);
      } else {
        changes.push(`Блок «${titles[type]}» уже есть на главной`);
      }
      break;
    }
    case "remove-section": {
      const type = (intent.value ?? "reviews") as "reviews" | "faq" | "gallery";
      steps.push({ label: "Убираем блок" }, { label: "Пересобираем страницу" });
      next = {
        ...next,
        pages: next.pages.map((page) => ({
          ...page,
          sections: page.sections.filter((section) => section.type !== type),
        })),
      };
      changes.push(`Блок «${type}» удалён со всех страниц`);
      break;
    }
    case "edit-heading": {
      const value = intent.text?.trim();
      if (!value) return { intent: "unknown", section: "—", steps: [], changes: [], suggestion: null, design: null };
      steps.push({ label: "Переписываем заголовок" }, { label: "Обновляем страницу" });
      const [home, ...rest] = next.pages;
      next = { ...next, pages: [{ ...home, hero: { ...home.hero, title: value } }, ...rest] };
      changes.push(`Заголовок: «${value}»`);
      break;
    }
    case "edit-text": {
      const value = intent.text?.trim();
      if (!value) return { intent: "unknown", section: "—", steps: [], changes: [], suggestion: null, design: null };
      steps.push({ label: "Обновляем текст" });
      const [home, ...rest] = next.pages;
      next = { ...next, pages: [{ ...home, hero: { ...home.hero, subtitle: value } }, ...rest] };
      changes.push(`Подзаголовок: «${value}»`);
      break;
    }
    case "edit-price": {
      const amount = intent.text?.trim();
      const target = intent.target?.trim().toLowerCase();
      // Both halves are required. A price with no named position, or a position with no number,
      // is an incomplete instruction — better to say so than to guess at someone's price list.
      if (!amount || !target) {
        return { intent: "unknown", section: "Цены", steps: [], changes: [], suggestion: null, design: null };
      }
      const offers = next.offers ?? { products: [...knowledge.products], services: [...knowledge.services] };
      const price = `${amount} ₸`.replace(/\s*₸\s*₸/, " ₸").trim();
      steps.push({ label: "Обновляем прайс" }, { label: "Пересчитываем блок цен" });
      const retag = (list: typeof offers.products) =>
        list.map((offer) => (offer.name.toLowerCase().includes(target) ? { ...offer, price } : offer));
      const updated = { products: retag(offers.products), services: retag(offers.services) };
      const changed = [...updated.products, ...updated.services].some(
        (offer) => offer.price === price && offer.name.toLowerCase().includes(target),
      );
      if (!changed) {
        return {
          intent: "unknown",
          section: "Цены",
          steps: [],
          changes: [],
          suggestion: null,
          design: null,
        };
      }
      next = { ...next, offers: updated };
      changes.push(`Цена «${intent.target}» → ${price}`);
      break;
    }
    case "remove-offer": {
      const target = intent.target?.trim().toLowerCase();
      // Without this guard an empty target matches EVERY name (`"x".includes("")` is true), so a
      // model answer with a missing target would silently wipe the entire price list.
      if (!target) {
        return { intent: "unknown", section: "Цены", steps: [], changes: [], suggestion: null, design: null };
      }
      const offers = next.offers ?? { products: [...knowledge.products], services: [...knowledge.services] };
      steps.push({ label: "Убираем позицию" }, { label: "Пересобираем прайс" });
      const drop = (list: typeof offers.products) => list.filter((offer) => !offer.name.toLowerCase().includes(target));
      const updated = { products: drop(offers.products), services: drop(offers.services) };
      const removed =
        offers.products.length + offers.services.length - (updated.products.length + updated.services.length);
      if (!removed) {
        return { intent: "unknown", section: "Цены", steps: [], changes: [], suggestion: null, design: null };
      }
      next = { ...next, offers: updated };
      changes.push(`Удалено позиций: ${removed} («${intent.target}»)`);
      break;
    }
    default:
      return { intent: "unknown", section: "—", steps: [], changes: [], suggestion: null, design: null };
  }

  const SECTION_BY_INTENT: Record<DesignerIntentId, string> = {
    darker: "Палитра",
    lighter: "Палитра",
    style: "Стиль",
    layout: "Макет",
    typography: "Типографика",
    "add-section": "Секции",
    "remove-section": "Секции",
    "edit-heading": "Заголовок",
    "edit-text": "Текст",
    "edit-price": "Цены",
    "remove-offer": "Цены",
    unknown: "—",
  };

  return {
    intent: intent.id,
    section: SECTION_BY_INTENT[intent.id],
    steps,
    changes,
    suggestion: suggestNext(intent.id, project, next),
    design: next,
  };
}

/** A short, factual receipt of one edit for the project's memory. */
export function toLogEntry(request: string, outcome: DesignerOutcome): DesignerEntry {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `entry-${Date.now()}`,
    at: Date.now(),
    request,
    section: outcome.section,
    changes: outcome.changes,
    suggestion: outcome.suggestion?.text ?? null,
  };
}
