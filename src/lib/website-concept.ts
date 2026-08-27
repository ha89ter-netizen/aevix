import { businessKnowledgeFor } from "./business-knowledge";

export const conceptBusinessTypes = [
  "Барбершоп",
  "Салон красоты",
  "Магазин",
  "Парфюмерный магазин",
  "Кофейня",
  "Ресторан",
  "Другое",
] as const;

export const conceptGoals = [
  "Записывать клиентов",
  "Получать заявки",
  "Показывать услуги",
  "Показывать каталог",
  "Вызывать доверие",
  "Продавать товары",
  "Другое",
] as const;

export const conceptSectionTypes = [
  "services",
  "pricing",
  "about",
  "gallery",
  "reviews",
  "booking",
  "contacts",
  "faq",
] as const;

/**
 * Минимальный состав структуры — ОДИН контракт на клиент и сервер.
 *
 * Число не взято из валидатора: три — это то, из чего сайт вообще состоит. Тот же состав
 * зашит в двух независимых местах, и оба появились раньше этой константы:
 *   · `recommendStructure` держит основой «о компании» и «контакты» и всегда добавляет к ним
 *     то, что бизнес предлагает, — его комментарий говорит прямо: «без „о компании“ и
 *     „контактов“ сайта не бывает ни у кого»;
 *   · маршрут генерации требует от модели ядро `services · about · contacts · (booking|pricing)`,
 *     пересечённое с подтверждённым человеком.
 * То есть «что предлагаем · кто мы · как связаться» — не порог валидатора, а минимальный
 * осмысленный сайт. Меньше трёх разделов маршрут отвергал и раньше, но мастер об этом не знал:
 * человек удалял разделы до двух, кнопка оставалась активной, запрос получал 400 и молча
 * подменялся локальным концептом. Теперь предел один и на обеих сторонах.
 *
 * Предложение мастера никогда не начинается ниже пяти разделов, поэтому ограничение видно
 * только тому, кто целенаправленно вычищает структуру.
 */
export const MIN_CONCEPT_SECTIONS = 3;

export const conceptSectionOptions = [
  { id: "services", label: "Услуги" },
  { id: "pricing", label: "Цены" },
  { id: "about", label: "О компании" },
  { id: "gallery", label: "Галерея" },
  { id: "reviews", label: "Отзывы" },
  { id: "booking", label: "Запись" },
  { id: "contacts", label: "Контакты" },
  { id: "faq", label: "FAQ" },
] as const;

/**
 * Primary color choices. `hue` is the base HSL hue used to generate the whole color system
 * (background/surface/border/text/accent/...) for that color — see `generateVisualIdentity`.
 * `mode` is the color's intrinsic light/dark identity: most colors sit on a light, tinted
 * background; a few (black, navy, burgundy) read as moody/premium on a dark one instead.
 * `neutral` colors (white/black/gray) ignore hue for saturation purposes and derive their
 * accent from lightness contrast alone rather than a tinted hue.
 */
export const conceptColors = [
  { id: "white", label: "Белый", swatch: "#FFFFFF", hue: 0, mode: "light", neutral: true },
  { id: "black", label: "Чёрный", swatch: "#121212", hue: 0, mode: "dark", neutral: true },
  { id: "gray", label: "Серый", swatch: "#6B7280", hue: 222, mode: "light", neutral: true },
  { id: "blue", label: "Синий", swatch: "#2563EB", hue: 221, mode: "light", neutral: false },
  { id: "navy", label: "Тёмно-синий", swatch: "#16233F", hue: 222, mode: "dark", neutral: false },
  { id: "teal", label: "Бирюзовый", swatch: "#0D9488", hue: 174, mode: "light", neutral: false },
  { id: "green", label: "Зелёный", swatch: "#16A34A", hue: 142, mode: "light", neutral: false },
  { id: "olive", label: "Оливковый", swatch: "#6B7A3A", hue: 73, mode: "light", neutral: false },
  { id: "brown", label: "Коричневый", swatch: "#8B5E34", hue: 27, mode: "light", neutral: false },
  { id: "beige", label: "Бежевый", swatch: "#C9B896", hue: 39, mode: "light", neutral: false },
  { id: "sand", label: "Песочный", swatch: "#D8B98C", hue: 34, mode: "light", neutral: false },
  { id: "orange", label: "Оранжевый", swatch: "#EA580C", hue: 22, mode: "light", neutral: false },
  { id: "red", label: "Красный", swatch: "#DC2626", hue: 358, mode: "light", neutral: false },
  { id: "burgundy", label: "Бордовый", swatch: "#5E1934", hue: 340, mode: "dark", neutral: false },
  { id: "purple", label: "Фиолетовый", swatch: "#7C3AED", hue: 262, mode: "light", neutral: false },
  { id: "pink", label: "Розовый", swatch: "#DB2777", hue: 328, mode: "light", neutral: false },
  { id: "gold", label: "Золотой", swatch: "#B8860B", hue: 45, mode: "light", neutral: false },
] as const;

/**
 * Visual styles modulate structure — radius, shadow, letter-spacing, weight, scale, spacing —
 * never font family. Combined with a primary color (see `conceptColors`) via
 * `generateVisualIdentity`, they form the concept's full visual identity.
 */
export const conceptStyles = [
  { id: "minimal", label: "Минимализм" },
  { id: "luxury", label: "Роскошь" },
  { id: "premium", label: "Премиум" },
  { id: "tech", label: "Технологичный" },
  { id: "organic", label: "Органический" },
  { id: "elegant", label: "Элегантный" },
  { id: "editorial", label: "Редакционный" },
  { id: "modern", label: "Современный" },
  { id: "brutalist", label: "Брутализм" },
  { id: "glass", label: "Стекло" },
  { id: "futuristic", label: "Футуризм" },
  { id: "soft", label: "Мягкий" },
  { id: "bold", label: "Дерзкий" },
] as const;

/**
 * Layout variants — composition, not color. Each one changes the hero structure, navigation
 * placement, gallery rhythm, card shapes and CTA placement (see the `data-layout` rules in
 * globals.css), so two concepts in the same niche can be built on genuinely different
 * templates instead of one universal template with different colors.
 */
export const conceptLayouts = [
  { id: "classic", label: "Классический" },
  { id: "editorial", label: "Журнальный" },
  { id: "showcase", label: "Витрина" },
] as const;

export type ConceptBusinessType = (typeof conceptBusinessTypes)[number];
export type ConceptGoal = (typeof conceptGoals)[number];
export type ConceptSectionType = (typeof conceptSectionTypes)[number];
export type ConceptColorId = (typeof conceptColors)[number]["id"];
export type ConceptStyleId = (typeof conceptStyles)[number]["id"];
export type ConceptLayoutId = (typeof conceptLayouts)[number]["id"];

export const MAX_CONCEPT_COLORS = 5;

export type WebsiteConceptInput = {
  /**
   * Ниша бизнеса свободной строкой, а не одной из семи фишек мастера.
   *
   * `conceptBusinessTypes` — словарь ПОДСКАЗОК на первом шаге, и им он и остаётся. Но продукт
   * распознаёт двадцать ниш каноническим резолвером, и мастер честно отдаёт сюда его ярлык:
   * «Автосервис», «Клиника», «Юрист». Пока здесь стоял закрытый союз, `conceptInputFrom`
   * пробивал его приведением типа, а серверная проверка отвергала запрос — и человек с любой
   * нишей вне тех семи молча получал локальный концепт вместо AI-концепта, без единого слова
   * об этом. Ответ модели проверяется здесь же свободной строкой (`validateWebsiteConcept`), то
   * есть закрытый список на входе был не замыслом, а недосмотром.
   */
  businessType: string;
  businessName: string;
  styleId: ConceptStyleId;
  /** 1-5 colors, in priority order: [0] is primary, [1] secondary, [2] carries the focus/tertiary
   * accent, and any beyond that only nudge the blended background/border tint (see
   * `generateVisualIdentity`) — never assigned to their own dedicated UI element. */
  colorIds: ConceptColorId[];
  customColors: string;
  goals: ConceptGoal[];
  sections: ConceptSectionType[];
  wishes: string;
  /** Город, названный человеком. Необязателен: концепт с лендинга его не спрашивает. */
  city?: string;
  /**
   * Названия разделов, если человек их переписал в мастере. Уходит в запрос к модели вместе с
   * остальным входом, поэтому она видит, как владелец назвал разделы своего сайта.
   */
  sectionTitles?: Partial<Record<ConceptSectionType, string>>;
};

export type ConceptOffer = { name: string; price: string };

export type WebsiteConceptSection = {
  type: ConceptSectionType;
  title: string;
  text: string;
  items: string[];
};

export type WebsiteConceptHero = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
};

export type WebsiteConceptPage = {
  id: string;
  name: string;
  hero: WebsiteConceptHero;
  sections: WebsiteConceptSection[];
};

export type WebsiteConcept = {
  businessName: string;
  businessType: string;
  /**
   * Город бизнеса, как его назвал человек. Хранится НА КОНЦЕПТЕ, а не берётся из базы знаний
   * при отрисовке: адреса в базе знаний — демонстрационные и жёстко привязаны к Алматы, из-за
   * чего проект с городом «Астана» показывал «Микрорайон Самал-2, 58, Алматы».
   *
   * Пусто у концептов, созданных до этого поля, и у концептов с лендинга, где город не
   * спрашивают, — тогда отрисовка ведёт себя как прежде.
   */
  city?: string;
  colorIds: ConceptColorId[];
  styleId: ConceptStyleId;
  /** Optional for backward compatibility: concepts saved before layouts existed render with
   * the seeded default (see resolveConceptLayout). */
  layoutId?: ConceptLayoutId;
  /**
   * The project's own price list. Seeded from the niche knowledge at generation time and owned
   * by the project from then on — prices and service names are the things people most want to
   * change, and they cannot be edited while they live in a shared constant. Absent on concepts
   * generated before this existed, which then fall back to the knowledge base.
   */
  offers?: { products: ConceptOffer[]; services: ConceptOffer[] };
  navigation: Array<{ label: string; pageId: string }>;
  pages: WebsiteConceptPage[];
};

/** The AI only ever generates content (name/copy/structure) — visual identity (colorIds/styleId)
 * always comes from the wizard's own input, never from the model, so it's attached separately. */
type WebsiteConceptContent = Omit<WebsiteConcept, "colorIds" | "styleId" | "layoutId">;

const PAGE_ID = /^[a-z][a-z0-9-]{1,30}$/;
const UNSAFE_GENERATED_CONTENT = /<\/?(?:script|style|iframe|object|embed|html|body|svg|form)|javascript:|data:text\/html|```|\b(?:eval|Function)\s*\(|=>|\b(?:import|export)\s+(?:default|from|const|function|class)/i;

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value as T[number]);
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > maxLength || UNSAFE_GENERATED_CONTENT.test(cleaned)) return null;
  return cleaned;
}

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length > maxLength || UNSAFE_GENERATED_CONTENT.test(cleaned)) return null;
  return cleaned;
}

function cleanKnownArray<T extends readonly string[]>(
  value: unknown,
  options: T,
  min: number,
  max: number,
): T[number][] | null {
  if (!Array.isArray(value) || value.length < min || value.length > max) return null;
  const unique = Array.from(new Set(value));
  if (!unique.every((item) => isOneOf(item, options))) return null;
  return unique as T[number][];
}

export function validateWebsiteConceptInput(value: unknown): WebsiteConceptInput | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WebsiteConceptInput>;
  const businessName = cleanText(candidate.businessName, 80);
  // Ниша — свободная строка той же чистки, что имя бизнеса: пустую не принимаем, длинную и
  // небезопасную тоже. Закрытого списка здесь больше нет — см. комментарий у типа.
  const businessType = cleanText(candidate.businessType, 80);
  const customColors = cleanOptionalText(candidate.customColors, 180);
  const wishes = cleanOptionalText(candidate.wishes, 700);
  const goals = cleanKnownArray(candidate.goals, conceptGoals, 1, conceptGoals.length);
  const sections = cleanKnownArray(candidate.sections, conceptSectionTypes, MIN_CONCEPT_SECTIONS, conceptSectionTypes.length);
  const colorIds = cleanKnownArray(
    candidate.colorIds,
    conceptColors.map((color) => color.id) as readonly ConceptColorId[],
    1,
    MAX_CONCEPT_COLORS,
  );

  if (!isOneOf(candidate.styleId, conceptStyles.map((style) => style.id))) return null;
  if (!businessName || !businessType || customColors === null || wishes === null || !goals || !sections || !colorIds) return null;

  return {
    businessType,
    businessName,
    styleId: candidate.styleId,
    colorIds,
    customColors,
    goals,
    sections,
    wishes,
    // Город приходит только из брифа Workspace; с лендинга его не спрашивают, и пустое
    // значение здесь — норма, а не потеря данных.
    city: cleanOptionalText(candidate.city, 80) || undefined,
    sectionTitles: cleanSectionTitles(candidate.sectionTitles),
  };
}

/** Названия разделов от клиента: только известные типы, только непустые строки. */
function cleanSectionTitles(value: unknown): Partial<Record<ConceptSectionType, string>> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const result: Partial<Record<ConceptSectionType, string>> = {};
  for (const [key, title] of Object.entries(value as Record<string, unknown>)) {
    if (!conceptSectionTypes.includes(key as ConceptSectionType)) continue;
    if (typeof title !== "string" || !title.trim()) continue;
    result[key as ConceptSectionType] = title.trim().slice(0, 60);
  }
  return Object.keys(result).length ? result : undefined;
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const items = value.map((item) => cleanText(item, maxLength));
  if (items.some((item) => !item)) return null;
  return items as string[];
}

export function validateWebsiteConcept(value: unknown): WebsiteConceptContent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WebsiteConceptContent>;

  const businessName = cleanText(candidate.businessName, 80);
  const businessType = cleanText(candidate.businessType, 80);

  if (!businessName || !businessType) return null;

  if (!Array.isArray(candidate.pages) || candidate.pages.length < 2 || candidate.pages.length > 4) return null;
  const pages: WebsiteConceptPage[] = [];
  const pageIds = new Set<string>();

  for (const rawPage of candidate.pages) {
    if (!rawPage || typeof rawPage !== "object") return null;
    const page = rawPage as Partial<WebsiteConceptPage>;
    const id = typeof page.id === "string" && PAGE_ID.test(page.id) ? page.id : null;
    const name = cleanText(page.name, 48);
    if (!id || !name || pageIds.has(id) || !page.hero || typeof page.hero !== "object") return null;
    pageIds.add(id);

    const hero = page.hero as Partial<WebsiteConceptHero>;
    const safeHero = {
      eyebrow: cleanText(hero.eyebrow, 80),
      title: cleanText(hero.title, 120),
      subtitle: cleanText(hero.subtitle, 240),
      primaryCta: cleanText(hero.primaryCta, 48),
      secondaryCta: cleanText(hero.secondaryCta, 48),
    };
    if (Object.values(safeHero).some((item) => !item)) return null;
    if (!Array.isArray(page.sections) || page.sections.length < 1 || page.sections.length > 5) return null;

    const sections: WebsiteConceptSection[] = [];
    for (const rawSection of page.sections) {
      if (!rawSection || typeof rawSection !== "object") return null;
      const section = rawSection as Partial<WebsiteConceptSection>;
      if (!isOneOf(section.type, conceptSectionTypes)) return null;
      const title = cleanText(section.title, 90);
      const text = cleanOptionalText(section.text, 360);
      const items = cleanStringArray(section.items, 6, 100);
      if (!title || text === null || !items) return null;
      sections.push({ type: section.type, title, text, items });
    }

    pages.push({ id, name, hero: safeHero as WebsiteConceptHero, sections });
  }

  if (pages[0]?.id !== "home") return null;
  if (!Array.isArray(candidate.navigation) || candidate.navigation.length !== pages.length) return null;
  const navigation: WebsiteConceptContent["navigation"] = [];
  const navigationIds = new Set<string>();
  for (const rawItem of candidate.navigation) {
    if (!rawItem || typeof rawItem !== "object") return null;
    const item = rawItem as { label?: unknown; pageId?: unknown };
    const label = cleanText(item.label, 48);
    const pageId = typeof item.pageId === "string" ? item.pageId : null;
    if (!label || !pageId || !pageIds.has(pageId) || navigationIds.has(pageId)) return null;
    navigationIds.add(pageId);
    navigation.push({ label, pageId });
  }
  if (navigationIds.size !== pageIds.size) return null;

  return {
    businessName,
    businessType,
    navigation,
    pages,
  };
}

export type ConceptColorSystem = {
  background: string;
  surface: string;
  border: string;
  muted: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  secondary: string;
  focus: string;
};

export type ConceptVisualTokens = {
  radius: string;
  radiusSmall: string;
  borderWidth: string;
  letterSpacing: string;
  headingWeight: number;
  bodyWeight: number;
  headingScale: number;
  spacing: number;
  shadowSm: string;
  shadowLg: string;
};

export type ConceptVisualIdentity = {
  palette: ConceptColorSystem;
  tokens: ConceptVisualTokens;
};

type StyleDefinition = {
  radius: number;
  radiusSmall: number;
  shadow: "none" | "soft" | "medium" | "strong" | "glow" | "hard";
  letterSpacing: string;
  headingWeight: number;
  bodyWeight: number;
  headingScale: number;
  spacing: number;
  borderWidth: number;
  /** How strongly the primary color's hue bleeds into background/surface (0..1). */
  tint: number;
  /** Additive nudge on the accent's saturation/lightness — how punchy vs. restrained it reads. */
  saturationBoost: number;
};

/**
 * Structural tokens per visual style — radius, shadow language, tracking, weight, scale,
 * density. Deliberately never touches font-family: hierarchy and character come from these
 * dimensions, not from swapping typefaces.
 */
const styleDefinitions: Record<ConceptStyleId, StyleDefinition> = {
  minimal: { radius: 10, radiusSmall: 8, shadow: "soft", letterSpacing: "-0.01em", headingWeight: 620, bodyWeight: 400, headingScale: 1, spacing: 1.05, borderWidth: 1, tint: 0.12, saturationBoost: -0.08 },
  luxury: { radius: 3, radiusSmall: 3, shadow: "soft", letterSpacing: "0.05em", headingWeight: 520, bodyWeight: 400, headingScale: 0.96, spacing: 1.18, borderWidth: 1, tint: 0.38, saturationBoost: -0.12 },
  premium: { radius: 14, radiusSmall: 10, shadow: "medium", letterSpacing: "-0.01em", headingWeight: 660, bodyWeight: 430, headingScale: 1.04, spacing: 1.1, borderWidth: 1, tint: 0.26, saturationBoost: 0 },
  tech: { radius: 6, radiusSmall: 5, shadow: "strong", letterSpacing: "0em", headingWeight: 700, bodyWeight: 450, headingScale: 0.98, spacing: 0.92, borderWidth: 1, tint: 0.08, saturationBoost: 0.08 },
  organic: { radius: 28, radiusSmall: 18, shadow: "soft", letterSpacing: "0em", headingWeight: 600, bodyWeight: 410, headingScale: 1, spacing: 1.22, borderWidth: 1, tint: 0.42, saturationBoost: -0.06 },
  elegant: { radius: 6, radiusSmall: 6, shadow: "soft", letterSpacing: "0.03em", headingWeight: 520, bodyWeight: 400, headingScale: 0.98, spacing: 1.16, borderWidth: 1, tint: 0.3, saturationBoost: -0.1 },
  editorial: { radius: 2, radiusSmall: 2, shadow: "none", letterSpacing: "0.02em", headingWeight: 600, bodyWeight: 400, headingScale: 1.06, spacing: 1.2, borderWidth: 1, tint: 0.18, saturationBoost: -0.14 },
  modern: { radius: 12, radiusSmall: 9, shadow: "medium", letterSpacing: "-0.01em", headingWeight: 660, bodyWeight: 420, headingScale: 1.02, spacing: 1.02, borderWidth: 1, tint: 0.2, saturationBoost: 0.04 },
  brutalist: { radius: 0, radiusSmall: 0, shadow: "hard", letterSpacing: "0em", headingWeight: 820, bodyWeight: 520, headingScale: 1.1, spacing: 0.92, borderWidth: 2, tint: 0.04, saturationBoost: 0.18 },
  glass: { radius: 18, radiusSmall: 14, shadow: "glow", letterSpacing: "0em", headingWeight: 620, bodyWeight: 410, headingScale: 1, spacing: 1.1, borderWidth: 1, tint: 0.28, saturationBoost: 0.06 },
  futuristic: { radius: 4, radiusSmall: 4, shadow: "glow", letterSpacing: "0.07em", headingWeight: 700, bodyWeight: 440, headingScale: 0.98, spacing: 0.94, borderWidth: 1, tint: 0.1, saturationBoost: 0.14 },
  soft: { radius: 24, radiusSmall: 16, shadow: "soft", letterSpacing: "0em", headingWeight: 560, bodyWeight: 400, headingScale: 0.98, spacing: 1.2, borderWidth: 1, tint: 0.34, saturationBoost: -0.1 },
  bold: { radius: 10, radiusSmall: 8, shadow: "strong", letterSpacing: "-0.02em", headingWeight: 800, bodyWeight: 470, headingScale: 1.08, spacing: 1, borderWidth: 1, tint: 0.16, saturationBoost: 0.16 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hsl(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${Math.round(hue)}deg ${clamp(s, 0, 100).toFixed(0)}% ${clamp(l, 0, 100).toFixed(0)}%)`;
}

/** Circular mean of hue angles (0-360°) — averaging hues naively would break near the 0/360
 * wrap-around (e.g. red 358° and red 2° would "average" to a nonsensical 180°/cyan). */
function circularMeanHue(hues: number[]) {
  if (!hues.length) return 0;
  const sumSin = hues.reduce((sum, h) => sum + Math.sin((h * Math.PI) / 180), 0);
  const sumCos = hues.reduce((sum, h) => sum + Math.cos((h * Math.PI) / 180), 0);
  if (sumSin === 0 && sumCos === 0) return hues[0];
  return ((Math.atan2(sumSin, sumCos) * 180) / Math.PI + 360) % 360;
}

type ConceptColorDef = (typeof conceptColors)[number];

/** Saturation/lightness for a color acting as an accent (vivid, interactive) — white/black/gray
 * derive from lightness contrast alone since they have no true hue. */
function accentTone(color: ConceptColorDef, isDark: boolean, saturationBoost: number) {
  if (color.id === "white") return { sat: 0, light: 14 };
  if (color.id === "black") return { sat: 0, light: 94 };
  if (color.id === "gray") return { sat: 6, light: isDark ? 78 : 32 };
  const sat = clamp(58 + saturationBoost * 100, 30, 92);
  const light = isDark ? clamp(60 + saturationBoost * 20, 48, 72) : clamp(48 - saturationBoost * 12, 34, 58);
  return { sat, light };
}

/** Saturation/lightness for a color acting as a soft supporting tone (secondary/focus) — same
 * hue as `accentTone`, pulled toward a quieter, more restrained lightness. */
function softTone(color: ConceptColorDef, isDark: boolean) {
  if (color.neutral) return hsl(0, 0, isDark ? 30 : 88);
  const { sat } = accentTone(color, isDark, 0);
  return hsl(color.hue, clamp(sat - 18, 12, 70), isDark ? 30 : 88);
}

/**
 * Derives ONE harmonious color system + structural token set from 1-5 selected colors and a
 * visual style — never a naive one-color-per-element assignment. The first color sets the
 * light/dark identity and (unless it's neutral with a chromatic color also selected) the main
 * accent; the next colors become secondary/focus tones; every selected color's hue blends into
 * the background/surface/border/muted tint via a circular mean, so a 5-color palette reads as
 * one considered system, not five clashing accents. Backgrounds and text always sit near
 * opposite ends of the lightness scale (98%/12% light, 8-12%/96% dark), guaranteeing strong,
 * accessible contrast regardless of which colors × style were picked.
 */
export function generateVisualIdentity(colorIds: ConceptColorId[], styleId: ConceptStyleId): ConceptVisualIdentity {
  const resolved = colorIds
    .map((id) => conceptColors.find((item) => item.id === id))
    .filter((item): item is ConceptColorDef => Boolean(item))
    .slice(0, MAX_CONCEPT_COLORS);
  const colors = resolved.length ? resolved : [conceptColors[0]];
  const def = styleDefinitions[styleId] ?? styleDefinitions.minimal;

  const primary = colors[0];
  const isDark = primary.mode === "dark";

  const chromaticHues = colors.filter((color) => !color.neutral).map((color) => color.hue);
  const allNeutral = chromaticHues.length === 0;
  const tintHue = allNeutral ? 0 : circularMeanHue(chromaticHues);
  const neutralRatio = colors.filter((color) => color.neutral).length / colors.length;
  const tintSat = allNeutral ? 0 : clamp((6 + def.tint * 26) * (1 - neutralRatio * 0.5), 3, 34);

  let background: string, surface: string, border: string, muted: string, text: string, textMuted: string;

  if (isDark) {
    const bgL = 8 + def.tint * 3;
    background = hsl(tintHue, tintSat, bgL);
    surface = hsl(tintHue, tintSat, bgL + 4);
    border = hsl(tintHue, tintSat * 0.8, bgL + 16);
    muted = hsl(tintHue, tintSat * 0.6, bgL + 32);
    text = hsl(tintHue, allNeutral ? 0 : 10, 96);
    textMuted = hsl(tintHue, allNeutral ? 0 : 8, 68);
  } else {
    background = hsl(tintHue, tintSat, 98);
    surface = hsl(tintHue, tintSat * 0.5, 100);
    border = hsl(tintHue, tintSat, 89);
    muted = hsl(tintHue, tintSat, 55);
    text = hsl(tintHue, allNeutral ? 0 : 14, 12);
    textMuted = hsl(tintHue, allNeutral ? 0 : 10, 42);
  }

  // Primary drives the accent unless it's neutral and a chromatic color was also picked — then
  // that chromatic color gets to actually show up as the brand's interactive color.
  const firstChromatic = colors.find((color) => !color.neutral);
  const accentColor = primary.neutral && firstChromatic ? firstChromatic : primary;
  const { sat: accentSat, light: accentLight } = accentTone(accentColor, isDark, def.saturationBoost);
  const accent = hsl(accentColor.hue, accentSat, accentLight);
  const accentHover = hsl(accentColor.hue, accentSat, isDark ? accentLight + 7 : accentLight - 7);
  const accentActive = hsl(accentColor.hue, accentSat, isDark ? accentLight - 6 : accentLight + 6);

  // Whatever colors are left (in the order the user picked them) become secondary and focus —
  // so a 3rd/4th/5th color still visibly earns its own role instead of being averaged away.
  const remaining = colors.filter((color) => color !== accentColor);
  const secondaryColor = remaining[0] ?? accentColor;
  const focusColor = remaining[1] ?? secondaryColor;
  const secondary = softTone(secondaryColor, isDark);
  const focus = remaining.length ? softTone(focusColor, isDark) : accent;

  const shadowRgb = isDark ? "0,0,0" : "16,16,20";
  const shadowByKeyword: Record<StyleDefinition["shadow"], { sm: string; lg: string }> = {
    none: { sm: "none", lg: "none" },
    soft: { sm: `0 8px 22px rgba(${shadowRgb},0.08)`, lg: `0 20px 50px rgba(${shadowRgb},0.1)` },
    medium: { sm: `0 10px 26px rgba(${shadowRgb},0.12)`, lg: `0 26px 60px rgba(${shadowRgb},0.14)` },
    strong: { sm: `0 14px 32px rgba(${shadowRgb},0.18)`, lg: `0 30px 70px rgba(${shadowRgb},0.2)` },
    glow: {
      sm: `0 0 0 1px color-mix(in srgb, ${accent} 30%, transparent), 0 10px 30px color-mix(in srgb, ${accent} 30%, transparent)`,
      lg: `0 0 0 1px color-mix(in srgb, ${accent} 24%, transparent), 0 28px 70px color-mix(in srgb, ${accent} 32%, transparent)`,
    },
    hard: { sm: `4px 4px 0 0 ${text}`, lg: `8px 8px 0 0 ${text}` },
  };
  const shadows = shadowByKeyword[def.shadow];

  return {
    palette: { background, surface, border, muted, text, textMuted, accent, accentHover, accentActive, secondary, focus },
    tokens: {
      radius: `${def.radius}px`,
      radiusSmall: `${def.radiusSmall}px`,
      borderWidth: `${def.borderWidth}px`,
      letterSpacing: def.letterSpacing,
      headingWeight: def.headingWeight,
      bodyWeight: def.bodyWeight,
      headingScale: def.headingScale,
      spacing: def.spacing,
      shadowSm: shadows.sm,
      shadowLg: shadows.lg,
    },
  };
}

/**
 * Tiny, dependency-free string hash. It only needs to spread similar business names apart so two
 * businesses in the same niche don't land on identical layouts or photo sets — it is not, and
 * does not need to be, collision-resistant. Exported because concept-images.ts seeds from the
 * same value; two copies of it drifting apart would silently decouple layout from imagery.
 */
export function conceptSeed(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Resolves the effective layout for a concept: an explicitly stored layoutId wins; otherwise
 * a seeded pick from the niche's recommended layouts, so older saved concepts (no layoutId)
 * and AI responses (which never choose layout) still land on a niche-appropriate template —
 * and two different businesses in the same niche land on different ones.
 */
export function resolveConceptLayout(concept: Pick<WebsiteConcept, "businessType" | "businessName" | "layoutId">): ConceptLayoutId {
  if (concept.layoutId && conceptLayouts.some((layout) => layout.id === concept.layoutId)) return concept.layoutId;
  const knowledge = businessKnowledgeFor(concept.businessType, concept.businessName);
  const preferred = knowledge.layouts.length ? knowledge.layouts : conceptLayouts.map((layout) => layout.id);
  return preferred[conceptSeed(concept.businessName || concept.businessType) % preferred.length];
}

/**
 * Rough landing-cost estimate for a generated concept, tied to current AEVIX prices.
 * Base = "Сайт компании" (от 200 000 ₸); grows with pages, sections, and booking
 * (which implies online booking / a bot). More selected options → higher price.
 */
export function estimateConceptPrice(concept: WebsiteConcept): { min: number; max: number } {
  const BASE = 100_000; // лендинг / сайт — стартовая цена
  const PER_EXTRA_PAGE = 25_000;
  const PER_SECTION = 8_000;
  const BOOKING = 40_000; // онлайн-запись / бот

  const totalSections = concept.pages.reduce((sum, page) => sum + page.sections.length, 0);
  const extraPages = Math.max(0, concept.pages.length - 1);
  const hasBooking = concept.pages.some((page) => page.sections.some((section) => section.type === "booking"));

  const raw = BASE + extraPages * PER_EXTRA_PAGE + totalSections * PER_SECTION + (hasBooking ? BOOKING : 0);
  const min = Math.round(raw / 10_000) * 10_000;
  const max = Math.round((raw * 1.4) / 10_000) * 10_000;
  return { min, max };
}

export function formatConceptPrice(value: number): string {
  return `${value.toLocaleString("ru-RU").replace(/ /g, " ")} ₸`;
}

/** Niches where the natural primary action is booking a time slot rather than sending a lead. */
const BOOKING_KNOWLEDGE_IDS = new Set(["barbershop", "beauty", "dental", "fitness", "restaurant", "auto", "hotel"]);

/**
 * Knowledge-first local generator: loads the niche's knowledge (page structure, the
 * products-vs-services split, About/FAQ/CTA content) and builds up to 4 distinct pages on top
 * of it. Every section instance carries page-specific content — the same section type never
 * repeats the same title/text on two pages, and the offer page shows the FULL catalogue while
 * the home page only teases it.
 */
/**
 * Демонстрационный адрес для контактов.
 *
 * Адреса в базе знаний привязаны к Алматы, и раньше они печатались как есть — проект с городом
 * «Астана» показывал «Микрорайон Самал-2, 58, Алматы». Улица из чужого города хуже, чем её
 * отсутствие: она выглядит настоящей и вводит в заблуждение.
 *
 * Поэтому правило простое. Город не назван — оставляем демо-адрес базы знаний, как было. Город
 * назван и совпадает с городом демо-адреса — адрес годится целиком. Город назван и другой —
 * улицу отбрасываем и показываем нейтральное «Город, Казахстан»: меньше подробностей, зато ни
 * одной ложной.
 */
/**
 * Убирает со страницы повторяющиеся по смыслу секции.
 *
 * Две разные беды, обе наблюдались на живой генерации.
 *
 * Первая: модель иногда выдаёт на одной странице две секции ОДНОГО типа — в замере попалось
 * «О нас: about, about». Ничто этого не ловило, и человек видел один и тот же блок дважды.
 *
 * Вторая тоньше. У бизнеса без товаров секция `pricing` показывает список услуг с ценами, а
 * секция `services` — те же услуги карточками. На странице, где модель поставила обе, выходит
 * один и тот же перечень подряд. При этом у бизнеса С товарами эта пара законна и осмысленна:
 * `pricing` — меню или каталог, `services` — сервисы вокруг него. Поэтому пара схлопывается
 * только там, где товаров нет.
 *
 * Ключ — тип секции, устойчивый смысловой признак, а не позиция в массиве: порядок меняется при
 * правках, регенерации и отмене, а тип нет. Остаётся ПЕРВАЯ секция: у `pricing` есть цены,
 * которых у `services` нет, а порядок в концепте идёт от важного к второстепенному.
 */
export function dedupeConceptSections(concept: WebsiteConcept, hasProducts: boolean): WebsiteConcept {
  let changed = false;
  // Сколько раз каждый тип встречается на всём сайте. Нужно, чтобы схлопывание пары
  // «услуги + цены» не унесло последнее вхождение типа: маршрут концепта требует набор
  // обязательных секций, и потеря любой отправила бы годный концепт в запасной путь.
  const siteWide = new Map<ConceptSectionType, number>();
  for (const page of concept.pages) {
    for (const section of page.sections) siteWide.set(section.type, (siteWide.get(section.type) ?? 0) + 1);
  }

  const pages = concept.pages.map((page) => {
    const seen = new Set<ConceptSectionType>();
    const kept = page.sections.filter((section) => {
      // Без товаров услуги и цены рисуются из одного источника — считаем их одним слотом,
      // но только если услуги останутся где-то ещё на сайте.
      const collapses =
        !hasProducts &&
        section.type === "services" &&
        (siteWide.get("services") ?? 0) > 1 &&
        page.sections.some((item) => item.type === "pricing");
      const slot: ConceptSectionType = collapses ? "pricing" : section.type;
      if (seen.has(slot)) {
        changed = true;
        siteWide.set(section.type, (siteWide.get(section.type) ?? 1) - 1);
        return false;
      }
      seen.add(slot);
      return true;
    });
    // Страница без секций сломала бы отрисовку сильнее, чем повтор: если фильтр вычистил всё,
    // оставляем как было.
    return kept.length ? { ...page, sections: kept } : page;
  });
  return changed ? { ...concept, pages } : concept;
}

export function conceptAddress(city: string | undefined, knowledgeAddress: string): string {
  const trimmed = city?.trim();
  if (!trimmed) return knowledgeAddress;
  // Сравнение по вхождению, а не по равенству: адрес — это «улица, дом, Город».
  if (knowledgeAddress.toLowerCase().includes(trimmed.toLowerCase())) return knowledgeAddress;
  return `${trimmed}, Казахстан`;
}

export function buildFallbackWebsiteConcept(input: WebsiteConceptInput): WebsiteConcept {
  const name = input.businessName;
  const knowledge = businessKnowledgeFor(input.businessType, name);
  const niche = knowledge.label === "Бизнес" ? input.businessType : knowledge.label;
  const isBooking = BOOKING_KNOWLEDGE_IDS.has(knowledge.id) || input.goals.includes("Записывать клиентов");
  const hasProducts = knowledge.products.length > 0;
  const wants = (type: ConceptSectionType) => input.sections.includes(type);

  const offerPage = hasProducts
    ? { id: "menu", name: knowledge.productsPageName ?? "Каталог" }
    : { id: "services", name: "Услуги" };
  const finalPage = isBooking ? { id: "booking", name: "Запись и контакты" } : { id: "contacts", name: "Контакты" };

  // Home teases; it never carries the full catalogue (that lives on the offer page only).
  const homeSections: WebsiteConceptSection[] = [
    {
      type: "services",
      title: hasProducts ? `${knowledge.servicesTitle}, который делает разницу` : "С чем мы работаем",
      text: hasProducts
        ? `${offerPage.name} — на отдельной странице. Здесь — то, что превращает ${niche.toLowerCase()} в сервис.`
        : `Ключевые направления ${name} — детали и полный список на странице «Услуги».`,
      items: (hasProducts ? knowledge.services : knowledge.services.slice(0, 6)).slice(0, 6).map((offer) => offer.name),
    },
  ];
  if (wants("reviews")) {
    homeSections.push({
      type: "reviews",
      title: "Что говорят гости",
      text: `Демонстрационные отзывы — так будет выглядеть живой блок доверия на сайте ${name}.`,
      items: [],
    });
  }

  const offerSections: WebsiteConceptSection[] = [
    {
      type: "pricing",
      title: hasProducts ? `${offerPage.name} и цены` : "Полный список услуг",
      text: hasProducts
        ? "Средние демонстрационные цены — реальные позиции заменят их при наполнении."
        : "Прозрачный прайс без звёздочек: демонстрационные средние цены по региону.",
      items: [],
    },
  ];
  if (hasProducts) {
    offerSections.push({
      type: "services",
      title: `Не только ${offerPage.name.toLowerCase()}`,
      text: "Сервисы, которые делают визит удобным.",
      items: knowledge.services.slice(0, 6).map((offer) => offer.name),
    });
  }
  if (wants("gallery")) {
    offerSections.push({
      type: "gallery",
      title: "Как это выглядит",
      text: "Атмосфера, продукт и процесс — подборка демонстрационных кадров ниши.",
      items: ["Пространство", "Процесс", "Детали", "Результат", "Команда", "Настроение"],
    });
  }

  const aboutSections: WebsiteConceptSection[] = [
    {
      type: "about",
      title: `История ${name}`,
      text: knowledge.about.mission,
      items: knowledge.about.whyUs,
    },
  ];
  if (wants("gallery")) {
    aboutSections.push({
      type: "gallery",
      title: "Атмосфера",
      text: knowledge.about.atmosphere,
      items: ["Пространство", "Люди", "Детали"],
    });
  }

  const finalSections: WebsiteConceptSection[] = [];
  if (isBooking) {
    finalSections.push({
      type: "booking",
      title: "Выберите удобное время",
      text: "Три шага от знакомства до подтверждённой записи — демонстрация сценария.",
      items: ["Выбрать услугу", "Указать время", "Получить подтверждение"],
    });
  }
  finalSections.push({
    type: "contacts",
    title: "Как нас найти",
    text: "Часы работы, адрес и быстрые способы связи — демонстрационные данные концепта.",
    items: [],
  });
  if (wants("faq")) {
    finalSections.push({
      type: "faq",
      title: "Частые вопросы",
      text: `Ответы, которые ${niche.toLowerCase()} даёт чаще всего — до первого звонка.`,
      items: [],
    });
  }

  const pages: WebsiteConceptPage[] = [
    {
      id: "home",
      name: "Главная",
      hero: {
        eyebrow: niche,
        title: `${name} — ${knowledge.about.mission.replace(/\.$/, "").toLowerCase()}`,
        subtitle: knowledge.about.story[0].split(". ").slice(0, 1).join(". ") + ".",
        primaryCta: knowledge.ctas.primary,
        secondaryCta: offerPage.name,
      },
      sections: homeSections,
    },
    {
      ...offerPage,
      hero: {
        eyebrow: offerPage.name,
        title: hasProducts ? `${offerPage.name} ${name}` : `Услуги ${name}`,
        subtitle: hasProducts
          ? "Полный ассортимент с демонстрационными ценами — структура будущего каталога."
          : "Каждая услуга — с понятной ценой и без скрытых условий.",
        primaryCta: knowledge.ctas.primary,
        secondaryCta: "О нас",
      },
      sections: offerSections,
    },
    {
      id: "about",
      name: "О нас",
      hero: {
        eyebrow: "О нас",
        title: `Почему ${niche.toLowerCase()} ${name} выбирают`,
        subtitle: knowledge.about.mission,
        primaryCta: knowledge.ctas.final,
        secondaryCta: finalPage.name,
      },
      sections: aboutSections,
    },
    {
      ...finalPage,
      hero: {
        eyebrow: finalPage.name,
        title: isBooking ? "Запишитесь в пару кликов" : `Свяжитесь с ${name}`,
        subtitle: "Контакты, часы работы и быстрый следующий шаг — в одном месте.",
        primaryCta: knowledge.ctas.final,
        secondaryCta: "Показать на карте",
      },
      sections: finalSections,
    },
  ];

  const concept: WebsiteConcept = {
    businessName: name,
    businessType: input.businessType,
    // Город остаётся на концепте: отрисовка не должна снова гадать его по базе знаний.
    city: input.city,
    colorIds: input.colorIds,
    styleId: input.styleId,
    layoutId: resolveConceptLayout({ businessType: input.businessType, businessName: name }),
    navigation: pages.map((page) => ({ label: page.name, pageId: page.id })),
    pages,
  };
  // Локальный генератор ставит пару «цены + услуги» на страницу предложения осознанно — но
  // только у бизнеса с товарами. Правило ниже это учитывает и такую пару не трогает.
  return dedupeConceptSections(concept, hasProducts);
}

export const WEBSITE_CONCEPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["businessName", "businessType", "navigation", "pages"],
  properties: {
    businessName: { type: "string", maxLength: 80 },
    businessType: { type: "string", maxLength: 80 },
    navigation: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "pageId"],
        properties: {
          label: { type: "string", maxLength: 48 },
          pageId: { type: "string", pattern: "^[a-z][a-z0-9-]{1,30}$" },
        },
      },
    },
    pages: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "hero", "sections"],
        properties: {
          id: { type: "string", pattern: "^[a-z][a-z0-9-]{1,30}$" },
          name: { type: "string", maxLength: 48 },
          hero: {
            type: "object",
            additionalProperties: false,
            required: ["eyebrow", "title", "subtitle", "primaryCta", "secondaryCta"],
            properties: {
              eyebrow: { type: "string", maxLength: 80 },
              title: { type: "string", maxLength: 120 },
              subtitle: { type: "string", maxLength: 240 },
              primaryCta: { type: "string", maxLength: 48 },
              secondaryCta: { type: "string", maxLength: 48 },
            },
          },
          sections: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["type", "title", "text", "items"],
              properties: {
                type: { type: "string", enum: conceptSectionTypes },
                title: { type: "string", maxLength: 90 },
                text: { type: "string", maxLength: 360 },
                items: {
                  type: "array",
                  maxItems: 6,
                  items: { type: "string", maxLength: 100 },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
