/**
 * Pure, dependency-free business detection for the Hero analysis field.
 *
 * Kept separate from React so it can be unit-reasoned and reused: given a free-text
 * business description it returns a recognised category plus the AEVIX automation points
 * most relevant to that category. Detection is local and instant, which is also the
 * graceful fallback when the AI endpoint is unavailable.
 */

export type HeroBusinessCategory =
  | "barbershop"
  | "beauty"
  | "food"
  | "ecommerce"
  | "dental"
  | "auto"
  | "generic";

export type HeroBusinessProfile = {
  category: HeroBusinessCategory;
  /** Human-readable business type, e.g. "Барбершоп". */
  label: string;
  /** One-line recognition descriptor shown under the label. */
  descriptor: string;
  /** 3–5 relevant AEVIX automation points. */
  automations: string[];
  /** Detection confidence 0–100 (keyword-match strength). */
  confidence: number;
};

/** Illustrative potential metrics (an estimate of upside, not a guarantee). */
export type BusinessMetrics = {
  /** Share of routine that AEVIX can take over, 0–100. */
  automationScore: number;
  hoursSavedPerWeek: number;
  revenueUpliftPct: number;
  priority: "Высокий" | "Средний";
};

export type BusinessFaq = { q: string; a: string };

/**
 * RGB channels of the per-business accent, morphed across the whole product.
 * Every accent must reach >= 4.5:1 contrast on white — it is used for small text
 * (`text-violet`), not just decorative fills.
 */
export type AccentRgb = { r: number; g: number; b: number };

/** Everything the site personalises once a business is recognised. */
export type BusinessContent = {
  accent: AccentRgb;
  metrics: BusinessMetrics;
  /** Ordered implementation roadmap phases shown in the hero control centre. */
  roadmap: string[];
  /** Personalised before → automated → result case. */
  caseBefore: string;
  caseAutomated: string;
  caseResult: string;
  /** Solution-module labels to spotlight, matching serviceCatalog titles. */
  focusModules: string[];
  /** Category-specific FAQ shown in the dynamic FAQ section. */
  faq: BusinessFaq[];
  /** Short line, e.g. shown in the nav status. */
  persona: string;
  /** Personalised primary CTA label. */
  ctaLabel: string;
};

/** Rotating, intentionally empty-by-default placeholder prompts for the Hero field. */
export const heroPlaceholderExamples = [
  "У меня салон красоты на 4 мастера…",
  "У меня кофейня с доставкой…",
  "У меня интернет-магазин парфюмерии…",
  "У меня барбершоп на 3 мастера…",
  "У меня стоматология…",
] as const;

// Confidence is derived at detection time from keyword-match strength, so seeds omit it.
type ProfileSeed = Omit<HeroBusinessProfile, "category" | "confidence"> & { keywords: string[] };

const PROFILE_SEEDS: Record<Exclude<HeroBusinessCategory, "generic">, ProfileSeed> = {
  barbershop: {
    label: "Барбершоп",
    descriptor: "Услуги по записи с мастерами",
    keywords: ["барбер", "стрижк", "стриж", "борода", "бород"],
    automations: [
      "Онлайн-запись к конкретному мастеру",
      "AI-консультант в WhatsApp и Telegram",
      "Напоминания о визите и меньше неявок",
      "CRM с историей клиентов и услуг",
      "Автоматический сбор отзывов после визита",
    ],
  },
  beauty: {
    label: "Салон красоты",
    descriptor: "Процедуры, мастера и запись",
    keywords: [
      "салон",
      "красот",
      "маникюр",
      "ногт",
      "бров",
      "ресниц",
      "космет",
      "spa",
      "спа",
      "визаж",
      "макияж",
    ],
    automations: [
      "Онлайн-запись по услугам и мастерам",
      "AI-ответы на вопросы о процедурах и ценах",
      "Подтверждения и напоминания о записи",
      "CRM с историей визитов и предпочтений",
      "Сбор отзывов и возврат клиентов",
    ],
  },
  food: {
    label: "Кофейня / ресторан",
    descriptor: "Заказы, доставка и бронь",
    keywords: [
      "кофейн",
      "кофе",
      "ресторан",
      "кафе",
      "бар ",
      "пиццер",
      "пицц",
      "суши",
      "доставка еды",
      "меню",
      "кухн",
    ],
    automations: [
      "Приём заказов и брони через бота",
      "AI-консультант по меню и доставке",
      "Статусы заказа и напоминания",
      "CRM и программа повторных заказов",
      "Сбор отзывов о заказе",
    ],
  },
  ecommerce: {
    label: "Интернет-магазин",
    descriptor: "Каталог, заказы и доставка",
    keywords: [
      "интернет-магазин",
      "интернет магазин",
      "магазин",
      "товар",
      "склад",
      "парфюм",
      "одежд",
      "маркетплейс",
      "каталог",
      "доставк",
    ],
    automations: [
      "AI-консультант по каталогу и наличию",
      "Оформление и статусы заказов",
      "Напоминания о брошенной корзине",
      "CRM с историей покупок",
      "Сбор отзывов и повторные продажи",
    ],
  },
  dental: {
    label: "Стоматология / клиника",
    descriptor: "Приём пациентов и запись",
    keywords: ["стоматолог", "клиник", "зуб", "врач", "медцентр", "доктор", "приём", "прием"],
    automations: [
      "Онлайн-запись к врачу по услугам",
      "AI-ответы на частые вопросы пациентов",
      "Напоминания о приёме и меньше неявок",
      "CRM с историей визитов",
      "Сбор отзывов после приёма",
    ],
  },
  auto: {
    label: "Автосервис / СТО",
    descriptor: "Заявки на услуги и запись",
    keywords: ["сто", "автосервис", "автосалон", "шином", "детейлинг", "ремонт авто", "ремонт машин"],
    automations: [
      "Приём заявок на услуги и запись",
      "AI-консультант по услугам и ценам",
      "Напоминания о записи и ТО",
      "CRM с историей обслуживания",
      "Сбор отзывов после ремонта",
    ],
  },
};

const GENERIC_PROFILE: HeroBusinessProfile = {
  category: "generic",
  label: "Малый бизнес",
  descriptor: "Обращения, заявки и рутина",
  automations: [
    "Единый поток входящих заявок",
    "AI-консультант в WhatsApp и Telegram",
    "Напоминания и подтверждения",
    "CRM со статусами и историей",
    "Автоматический сбор отзывов",
  ],
  // Low confidence: nothing specific matched, so the UI invites more detail.
  confidence: 58,
};

// Ordered by specificity so a description that mentions several things resolves to the
// most concrete category first (e.g. "барбершоп" before the generic "магазин").
const DETECTION_ORDER: Array<Exclude<HeroBusinessCategory, "generic">> = [
  "barbershop",
  "dental",
  "auto",
  "beauty",
  "food",
  "ecommerce",
];

export function detectBusiness(input: string): HeroBusinessProfile {
  const normalized = input.toLowerCase();

  for (const category of DETECTION_ORDER) {
    const seed = PROFILE_SEEDS[category];
    const matched = seed.keywords.filter((keyword) => normalized.includes(keyword)).length;
    if (matched > 0) {
      return {
        category,
        label: seed.label,
        descriptor: seed.descriptor,
        automations: seed.automations.slice(0, 5),
        confidence: Math.min(97, 82 + matched * 5),
      };
    }
  }

  return GENERIC_PROFILE;
}

/**
 * Per-category personalisation content. Metrics are framed as potential estimates, in line
 * with the site's "possible scenarios, not client results" disclaimer.
 */
export const businessContent: Record<HeroBusinessCategory, BusinessContent> = {
  barbershop: {
    accent: { r: 109, g: 94, b: 214 },
    metrics: { automationScore: 82, hoursSavedPerWeek: 9, revenueUpliftPct: 14, priority: "Высокий" },
    roadmap: ["AI-консультант", "Онлайн-запись", "CRM", "Напоминания", "Отзывы"],
    caseBefore: "Клиенты пишут в разные чаты, администратор вручную сверяет свободные окна мастеров.",
    caseAutomated: "AEVIX отвечает, подбирает мастера и время, фиксирует запись и запускает напоминание.",
    caseResult: "Меньше пропущенных записей, ровная загрузка мастеров и поток записей на виду у владельца.",
    focusModules: ["AI-консультант", "CRM", "Комплексная автоматизация"],
    faq: [
      { q: "Как клиенты будут записываться?", a: "Через сайт, Telegram или WhatsApp: AI подбирает мастера, услугу и свободное окно, а запись сразу попадает в CRM." },
      { q: "Снизит ли это количество неявок?", a: "Да. Автоматические подтверждения и напоминания перед визитом обычно заметно снижают неявки." },
      { q: "А если у меня несколько мастеров?", a: "Система ведёт расписание по каждому мастеру и предлагает клиенту только реально свободное время." },
    ],
    persona: "Настроено под барбершоп",
    ctaLabel: "Собрать систему для барбершопа",
  },
  beauty: {
    accent: { r: 166, g: 91, b: 141 },
    metrics: { automationScore: 85, hoursSavedPerWeek: 11, revenueUpliftPct: 16, priority: "Высокий" },
    roadmap: ["AI-консультант", "Запись по мастерам", "CRM", "Напоминания", "Возврат клиентов"],
    caseBefore: "Администратор вручную ведёт запись по услугам и мастерам в нескольких чатах.",
    caseAutomated: "AEVIX уточняет процедуру, подбирает мастера и время, ведёт историю визитов.",
    caseResult: "Прозрачная загрузка мастеров, понятные популярные услуги и выше возвращаемость клиентов.",
    focusModules: ["AI-консультант", "CRM", "WhatsApp-бот"],
    faq: [
      { q: "Можно записывать на конкретного мастера?", a: "Да. AI уточняет услугу и мастера и предлагает только доступные окна этого специалиста." },
      { q: "Будет ли храниться история клиента?", a: "CRM хранит визиты и предпочтения, поэтому повторная запись и допродажа услуг проще." },
      { q: "Как система вернёт клиента?", a: "После процедуры собирается отзыв и по расписанию можно мягко напомнить о следующем визите." },
    ],
    persona: "Настроено под салон красоты",
    ctaLabel: "Автоматизировать салон",
  },
  food: {
    accent: { r: 157, g: 105, b: 61 },
    metrics: { automationScore: 78, hoursSavedPerWeek: 12, revenueUpliftPct: 12, priority: "Высокий" },
    roadmap: ["AI-консультант", "Приём заказов", "Бронь / доставка", "CRM", "Отзывы"],
    caseBefore: "Гости спрашивают меню, бронь, доставку и акции в разных каналах — команда отвечает вручную.",
    caseAutomated: "AEVIX выбирает сценарий: бронь, меню, вопрос по заказу или обратная связь.",
    caseResult: "Типовые вопросы закрываются автоматически, а команда остаётся в зале и на кухне.",
    focusModules: ["AI-консультант", "Telegram-бот", "Комплексная автоматизация"],
    faq: [
      { q: "Сможет ли бот принимать брони?", a: "Да. Гость выбирает дату и время, бронь фиксируется и подтверждается автоматически." },
      { q: "А доставку и меню потянет?", a: "AI отвечает по меню, помогает оформить доставку и передаёт заказ команде со статусом." },
      { q: "Как собирать отзывы?", a: "После заказа система отправляет запрос обратной связи и складывает ответы в одно место." },
    ],
    persona: "Настроено под кофейню / ресторан",
    ctaLabel: "Собрать систему для заведения",
  },
  ecommerce: {
    accent: { r: 72, g: 114, b: 199 },
    metrics: { automationScore: 80, hoursSavedPerWeek: 10, revenueUpliftPct: 18, priority: "Высокий" },
    roadmap: ["AI-консультант", "Каталог и заказы", "CRM", "Корзина", "Повторные продажи"],
    caseBefore: "Покупатели уточняют наличие, цену и доставку в переписке — менеджер отвечает вручную.",
    caseAutomated: "AEVIX отвечает по каталогу, собирает данные заказа и передаёт сложные случаи сотруднику.",
    caseResult: "Быстрее ответы, меньше брошенных корзин и больше повторных заказов.",
    focusModules: ["AI-консультант", "Сайт компании", "CRM"],
    faq: [
      { q: "Ответит ли AI по наличию и цене?", a: "Да. Консультант отвечает по каталогу, помогает подобрать товар и оформить заказ." },
      { q: "Поможет с брошенными корзинами?", a: "Система может напомнить о незавершённом заказе и вернуть покупателя к оформлению." },
      { q: "Данные заказов где хранятся?", a: "Заказы и статусы попадают в CRM, поэтому история покупок и повторные продажи под контролем." },
    ],
    persona: "Настроено под интернет-магазин",
    ctaLabel: "Автоматизировать магазин",
  },
  dental: {
    accent: { r: 48, g: 127, b: 134 },
    metrics: { automationScore: 76, hoursSavedPerWeek: 8, revenueUpliftPct: 11, priority: "Средний" },
    roadmap: ["AI-консультант", "Онлайн-запись", "CRM", "Напоминания", "Отзывы"],
    caseBefore: "Администратор вручную записывает пациентов и отвечает на частые вопросы по услугам.",
    caseAutomated: "AEVIX отвечает на вопросы, подбирает врача и время, ведёт историю визитов.",
    caseResult: "Меньше неявок, ровное расписание врачей и понятная история обращений пациентов.",
    focusModules: ["AI-консультант", "CRM", "WhatsApp-бот"],
    faq: [
      { q: "Как пациенты будут записываться?", a: "AI подбирает врача, услугу и свободное время; запись фиксируется в CRM с историей визитов." },
      { q: "Уменьшит ли неявки?", a: "Подтверждения и напоминания перед приёмом обычно заметно снижают количество неявок." },
      { q: "Ответит на частые вопросы?", a: "Да. Консультант отвечает на типовые вопросы об услугах, а сложные передаёт администратору." },
    ],
    persona: "Настроено под клинику",
    ctaLabel: "Собрать систему для клиники",
  },
  auto: {
    accent: { r: 96, g: 112, b: 148 },
    metrics: { automationScore: 74, hoursSavedPerWeek: 8, revenueUpliftPct: 10, priority: "Средний" },
    roadmap: ["AI-консультант", "Приём заявок", "CRM", "Напоминания о ТО", "Отзывы"],
    caseBefore: "Заявки на услуги приходят в разные каналы, приёмщик вручную согласует время и цену.",
    caseAutomated: "AEVIX принимает заявку, уточняет услугу и время, ведёт историю обслуживания.",
    caseResult: "Заявки не теряются, загрузка постов ровнее и клиенты вовремя возвращаются на ТО.",
    focusModules: ["AI-консультант", "CRM", "Telegram-бот"],
    faq: [
      { q: "Как будут приходить заявки?", a: "Клиент описывает задачу, AI уточняет услугу, авто и удобное время, заявка попадает в CRM." },
      { q: "Напомнит клиентам о ТО?", a: "Да. По истории обслуживания система вовремя напоминает клиентам о плановом ТО." },
      { q: "Ответит по услугам и цене?", a: "Консультант отвечает по типовым услугам и ориентирам цены, сложное передаёт мастеру." },
    ],
    persona: "Настроено под автосервис",
    ctaLabel: "Собрать систему для автосервиса",
  },
  generic: {
    accent: { r: 118, g: 89, b: 247 },
    metrics: { automationScore: 72, hoursSavedPerWeek: 7, revenueUpliftPct: 10, priority: "Средний" },
    roadmap: ["AI-консультант", "Поток заявок", "CRM", "Напоминания", "Отзывы"],
    caseBefore: "Обращения приходят в разные каналы, команда держит статусы и ответы в голове.",
    caseAutomated: "AEVIX собирает входящие в один поток, отвечает на типовое и фиксирует заявки.",
    caseResult: "Единый поток обращений, понятные статусы и меньше ручной рутины у команды.",
    focusModules: ["AI-консультант", "CRM", "Комплексная автоматизация"],
    faq: [
      { q: "С чего начать автоматизацию?", a: "Обычно с AI-консультанта и CRM: входящие собираются в один поток, а типовое закрывается автоматически." },
      { q: "Подойдёт ли под мою нишу?", a: "AEVIX собирается под конкретный процесс — опишите бизнес, и система предложит подходящие модули." },
      { q: "Сколько времени это экономит?", a: "Точная оценка — после разбора процесса. Как правило, уходит заметная часть ручной переписки." },
    ],
    persona: "Настроено под ваш бизнес",
    ctaLabel: "Собрать систему под ваш бизнес",
  },
};

export function getBusinessContent(category: HeroBusinessCategory): BusinessContent {
  return businessContent[category];
}
