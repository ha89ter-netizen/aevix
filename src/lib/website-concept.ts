export const conceptBusinessTypes = [
  "Барбершоп",
  "Салон красоты",
  "Магазин",
  "Парфюмерный магазин",
  "Кофейня",
  "Ресторан",
  "Другое",
] as const;

export const conceptMoods = [
  "Премиальный минимализм",
  "Теплый и элегантный",
  "Современный технологичный",
  "Яркий и дружелюбный",
  "Темная роскошь",
  "Свой вариант",
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

export const conceptTemplates = [
  "premium-minimal",
  "warm-editorial",
  "modern-technological",
] as const;

export const conceptPalettes = [
  {
    id: "silver-violet",
    label: "Серебро и фиолетовый",
    colors: { background: "#F5F6F8", surface: "#FFFFFF", text: "#17181B", accent: "#7257E8" },
  },
  {
    id: "warm-ivory",
    label: "Теплый фарфор",
    colors: { background: "#F8F4EC", surface: "#FFFDF8", text: "#241F1A", accent: "#A35F42" },
  },
  {
    id: "cool-blue",
    label: "Холодный голубой",
    colors: { background: "#EEF3F7", surface: "#FFFFFF", text: "#14202B", accent: "#297DB5" },
  },
  {
    id: "soft-rose",
    label: "Мягкий розовый",
    colors: { background: "#F8F1F3", surface: "#FFFDFD", text: "#2B2024", accent: "#B55378" },
  },
] as const;

export type ConceptBusinessType = (typeof conceptBusinessTypes)[number];
export type ConceptMood = (typeof conceptMoods)[number];
export type ConceptGoal = (typeof conceptGoals)[number];
export type ConceptSectionType = (typeof conceptSectionTypes)[number];
export type ConceptTemplate = (typeof conceptTemplates)[number];
export type ConceptPaletteId = (typeof conceptPalettes)[number]["id"];

export type WebsiteConceptInput = {
  businessType: ConceptBusinessType;
  businessName: string;
  visualMood: ConceptMood;
  palettePreset: ConceptPaletteId;
  customColors: string;
  goals: ConceptGoal[];
  sections: ConceptSectionType[];
  wishes: string;
};

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
  template: ConceptTemplate;
  style: string;
  palette: {
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  navigation: Array<{ label: string; pageId: string }>;
  pages: WebsiteConceptPage[];
};

const HEX_COLOR = /^#[0-9A-F]{6}$/i;
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
  const customColors = cleanOptionalText(candidate.customColors, 180);
  const wishes = cleanOptionalText(candidate.wishes, 700);
  const goals = cleanKnownArray(candidate.goals, conceptGoals, 1, conceptGoals.length);
  const sections = cleanKnownArray(candidate.sections, conceptSectionTypes, 3, conceptSectionTypes.length);

  if (!isOneOf(candidate.businessType, conceptBusinessTypes)) return null;
  if (!isOneOf(candidate.visualMood, conceptMoods)) return null;
  if (!isOneOf(candidate.palettePreset, conceptPalettes.map((palette) => palette.id))) return null;
  if (!businessName || customColors === null || wishes === null || !goals || !sections) return null;

  return {
    businessType: candidate.businessType,
    businessName,
    visualMood: candidate.visualMood,
    palettePreset: candidate.palettePreset,
    customColors,
    goals,
    sections,
    wishes,
  };
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const items = value.map((item) => cleanText(item, maxLength));
  if (items.some((item) => !item)) return null;
  return items as string[];
}

export function validateWebsiteConcept(value: unknown): WebsiteConcept | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WebsiteConcept>;
  if (!candidate.palette || typeof candidate.palette !== "object") return null;
  if (!isOneOf(candidate.template, conceptTemplates)) return null;

  const businessName = cleanText(candidate.businessName, 80);
  const businessType = cleanText(candidate.businessType, 80);
  const style = cleanText(candidate.style, 120);
  const palette = candidate.palette as WebsiteConcept["palette"];

  if (!businessName || !businessType || !style) return null;
  if (![palette.background, palette.surface, palette.text, palette.accent].every((color) => HEX_COLOR.test(color))) return null;

  if (!Array.isArray(candidate.pages) || candidate.pages.length < 2 || candidate.pages.length > 3) return null;
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
  const navigation: WebsiteConcept["navigation"] = [];
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
    template: candidate.template,
    style,
    palette: {
      background: palette.background.toUpperCase(),
      surface: palette.surface.toUpperCase(),
      text: palette.text.toUpperCase(),
      accent: palette.accent.toUpperCase(),
    },
    navigation,
    pages,
  };
}

function templateForMood(mood: ConceptMood): ConceptTemplate {
  if (mood === "Теплый и элегантный") return "warm-editorial";
  if (mood === "Современный технологичный" || mood === "Яркий и дружелюбный") return "modern-technological";
  return "premium-minimal";
}

function sectionContent(type: ConceptSectionType, input: WebsiteConceptInput): WebsiteConceptSection {
  const name = input.businessName;
  const content: Record<ConceptSectionType, WebsiteConceptSection> = {
    services: {
      type,
      title: "Главное — без лишних шагов",
      text: `Ключевые предложения ${name}, собранные так, чтобы посетитель быстро понял ценность.`,
      items: ["Основное направление", "Персональный подход", "Понятный следующий шаг"],
    },
    pricing: {
      type,
      title: "Форматы и стоимость",
      text: "Точный состав зависит от выбранной услуги и задачи клиента.",
      items: ["Базовый формат", "Расширенный формат", "Индивидуальное решение"],
    },
    about: {
      type,
      title: `Почему выбирают ${name}`,
      text: `${name} соединяет внимание к деталям, понятный сервис и спокойную коммуникацию.`,
      items: ["Понятный процесс", "Внимание к деталям", "Прямая коммуникация"],
    },
    gallery: {
      type,
      title: "Атмосфера и детали",
      text: "Визуальная подборка пространства, продукта и процесса.",
      items: ["Пространство", "Детали", "Результат"],
    },
    reviews: {
      type,
      title: "Что ценят клиенты",
      text: "Место для подтвержденных отзывов и живой обратной связи.",
      items: ["Внимательное отношение", "Понятный сервис", "Качество деталей"],
    },
    booking: {
      type,
      title: "Выберите удобное время",
      text: "Короткий путь от первого знакомства до записи.",
      items: ["Выбрать услугу", "Указать время", "Получить подтверждение"],
    },
    contacts: {
      type,
      title: "Свяжитесь удобным способом",
      text: "Контакты, адрес и понятный следующий шаг без лишних форм.",
      items: ["WhatsApp", "Telegram", "Показать на карте"],
    },
    faq: {
      type,
      title: "Коротко о важном",
      text: "Ответы на вопросы, которые возникают перед первым обращением.",
      items: ["Как начать?", "Что входит в услугу?", "Как проходит оплата?"],
    },
  };
  return content[type];
}

export function buildFallbackWebsiteConcept(input: WebsiteConceptInput): WebsiteConcept {
  const palette = conceptPalettes.find((item) => item.id === input.palettePreset) ?? conceptPalettes[0];
  const primaryGoal = input.goals[0] ?? "Получать заявки";
  const isBookingBusiness = ["Барбершоп", "Салон красоты", "Ресторан", "Кофейня"].includes(input.businessType);
  const middlePage = input.businessType === "Ресторан" || input.businessType === "Кофейня"
    ? { id: "menu", name: "Меню" }
    : input.businessType === "Парфюмерный магазин" || input.businessType === "Магазин"
      ? { id: "catalog", name: "Каталог" }
      : input.businessType === "Барбершоп" || input.businessType === "Салон красоты"
        ? { id: "services", name: "Услуги и мастера" }
        : { id: "services", name: "Услуги" };
  const finalPage = input.businessType === "Ресторан"
    ? { id: "booking", name: "Бронирование и контакты" }
    : input.businessType === "Барбершоп"
      ? { id: "booking", name: "Запись и контакты" }
      : input.businessType === "Салон красоты"
        ? { id: "booking", name: "Запись" }
        : input.businessType === "Парфюмерный магазин"
          ? { id: "contacts", name: "О бренде и контакты" }
          : { id: "contacts", name: "Контакты" };

  const pages: WebsiteConceptPage[] = [
    {
      id: "home",
      name: "Главная",
      hero: {
        eyebrow: input.businessType,
        title: `${input.businessName} — место, к которому хочется вернуться`,
        subtitle: `Понятная подача, характер бренда и быстрый путь к действию: ${primaryGoal.toLowerCase()}.`,
        primaryCta: isBookingBusiness ? "Записаться" : "Оставить заявку",
        secondaryCta: middlePage.name,
      },
      sections: [sectionContent("services", input), sectionContent("about", input)],
    },
    {
      ...middlePage,
      hero: {
        eyebrow: middlePage.name,
        title: `${middlePage.name} ${input.businessName}`,
        subtitle: "Основные направления, понятная структура и детали выбора без лишней информации.",
        primaryCta: isBookingBusiness ? "Выбрать услугу" : "Открыть каталог",
        secondaryCta: "Узнать больше",
      },
      sections: [sectionContent("services", input), sectionContent("pricing", input), sectionContent("gallery", input)],
    },
    {
      ...finalPage,
      hero: {
        eyebrow: finalPage.name,
        title: isBookingBusiness ? "Выберите удобный следующий шаг" : `Свяжитесь с ${input.businessName}`,
        subtitle: "Контакты, часы работы и демонстрационный сценарий обращения в одном месте.",
        primaryCta: isBookingBusiness ? "Выбрать время" : "Связаться",
        secondaryCta: "Посмотреть контакты",
      },
      sections: isBookingBusiness
        ? [sectionContent("booking", input), sectionContent("contacts", input), sectionContent("faq", input)]
        : [sectionContent("about", input), sectionContent("contacts", input), sectionContent("faq", input)],
    },
  ];

  return {
    businessName: input.businessName,
    businessType: input.businessType,
    template: templateForMood(input.visualMood),
    style: input.visualMood,
    palette: { ...palette.colors },
    navigation: pages.map((page) => ({ label: page.name, pageId: page.id })),
    pages,
  };
}

export const WEBSITE_CONCEPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["businessName", "businessType", "template", "style", "palette", "navigation", "pages"],
  properties: {
    businessName: { type: "string", maxLength: 80 },
    businessType: { type: "string", maxLength: 80 },
    template: { type: "string", enum: conceptTemplates },
    style: { type: "string", maxLength: 120 },
    palette: {
      type: "object",
      additionalProperties: false,
      required: ["background", "surface", "text", "accent"],
      properties: {
        background: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
        surface: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
        text: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
        accent: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
      },
    },
    navigation: {
      type: "array",
      minItems: 2,
      maxItems: 3,
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
      maxItems: 3,
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
