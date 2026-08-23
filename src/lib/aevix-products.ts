import type { NicheId } from "./niche";

/**
 * Каноническая модель услуг AEVIX (этап 7, Wave 4) — ЕДИНСТВЕННЫЙ источник истины о продуктах,
 * ценах и их семантике. UI (site-experience) читает ОТСЮДА и не заводит свои копии описаний/цен.
 *
 * Модель — «Core + Channels», а не плоский список продуктов. Прежняя ошибка категории: `AI`,
 * `Telegram` и `WhatsApp` стояли тремя равноуровневыми продуктами с почти одинаковыми описаниями и
 * разными ценами (AI 120k < Telegram 150k < WhatsApp 180k) — клиент справедливо спрашивал «почему
 * канал дороже интеллекта?». Здесь это разведено:
 *   - CORE       — AI-ассистент: сам интеллект. Нужен всем.
 *   - CAPABILITY — что ассистент умеет: запись, напоминания, CRM, заказы, автоматизация.
 *   - CHANNEL    — где он работает: сайт, Telegram, WhatsApp. Разница цены каналов — из РЕАЛЬНОГО
 *                  scope: Telegram Bot API бесплатен (канал включён), WhatsApp Business API требует
 *                  верифицированный номер и провайдера — отсюда разовое подключение, а не наценка «из
 *                  воздуха».
 *
 * Никаких выдуманных ROI/скидок/дефицита. Единственная скидка — реальная акция на первый проект,
 * и она живёт ЗДЕСЬ (одно число), а не размазана по промптам и копирайту.
 */

/** Реальная акция: первый проект клиента — со скидкой. Одно число, один источник. */
export const FIRST_PROJECT_DISCOUNT = 0.1;

export type ProductKind = "core" | "capability" | "channel" | "addon";

/** Семантика цены — чтобы клиент не гадал «разово или каждый месяц». */
export type Recurrence =
  | "one-time" // разовая настройка/разработка
  | "included" // входит в основу, отдельно не тарифицируется
  | "usage"; // зависит от объёма (например, стоимость отправок сообщений у провайдера)

export type PriceModel =
  | "from" // «от N ₸» — стандартизировано, но зависит от объёма
  | "fixed" // фиксировано
  | "custom" // по оценке проекта
  | "included" // включено
  | "bonus"; // бонус

export type AevixProduct = {
  id: string;
  title: string;
  kind: ProductKind;
  /** Одна фраза «что это». РАЗНАЯ у каждого — одинаковых описаний быть не должно. */
  description: string;
  /** Кому это нужно (для какого бизнеса/сценария). */
  forWhom: string;
  priceModel: PriceModel;
  /** Базовая цена в тенге; 0 для included/bonus. */
  price: number;
  recurrence: Recurrence;
  /** Короткая честная пометка семантики цены: «разово», «подключение API», «включено». */
  priceNote: string;
};

/** Человекочитаемый ярлык категории для UI. */
export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  core: "Основа",
  capability: "Возможность",
  channel: "Канал",
  addon: "Бонус",
};

/**
 * Продукты по каноническим id (совпадают с ServiceId в site-experience, чтобы калькулятор и
 * рекомендации читали один источник без дублирования).
 */
export const AEVIX_PRODUCTS: AevixProduct[] = [
  {
    id: "ai",
    title: "AI-консультант",
    kind: "core",
    description: "Интеллект системы: понимает вопрос клиента, уточняет задачу и передаёт сотруднику уже готовое обращение.",
    forWhom: "Основа для любого бизнеса — с него начинается автоматизация общения.",
    priceModel: "from",
    price: 120_000,
    recurrence: "one-time",
    priceNote: "разовая настройка, от",
  },
  {
    id: "site",
    title: "Сайт / лендинг",
    kind: "channel",
    description: "Канал: рабочая точка входа, где клиент понимает услугу и оставляет заявку, а ассистент подключён прямо на странице.",
    forWhom: "Нужен, если клиенты приходят из поиска, рекламы или по ссылке.",
    priceModel: "from",
    price: 100_000,
    recurrence: "one-time",
    priceNote: "разработка, от",
  },
  {
    id: "telegram",
    title: "Telegram",
    kind: "channel",
    description: "Канал: тот же ассистент отвечает в Telegram. Bot API бесплатен — подключение не требует отдельной оплаты.",
    forWhom: "Если аудитория и заявки уже идут через Telegram.",
    priceModel: "included",
    price: 0,
    recurrence: "included",
    priceNote: "включено в основу",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    kind: "channel",
    description: "Канал: ассистент в WhatsApp. Business API требует верифицированный номер и провайдера — отсюда разовое подключение.",
    forWhom: "Если клиенты привыкли писать именно в WhatsApp.",
    priceModel: "from",
    price: 60_000,
    recurrence: "one-time",
    priceNote: "подключение Business API, разово",
  },
  {
    id: "crm",
    title: "CRM",
    kind: "capability",
    description: "Возможность: заявки, статусы и история клиентов в одном рабочем контуре — видно, где застрял процесс.",
    forWhom: "Когда данные разбросаны по чатам, таблицам и заметкам.",
    priceModel: "custom",
    price: 0,
    recurrence: "one-time",
    priceNote: "по составу проекта",
  },
  {
    id: "automation",
    title: "Комплексная автоматизация",
    kind: "capability",
    description: "Возможность: связывает запись, напоминания, статусы и CRM в один сценарий, который работает без ручного контроля.",
    forWhom: "Когда процессов несколько и их нужно свести в одну систему.",
    priceModel: "from",
    price: 350_000,
    recurrence: "one-time",
    priceNote: "разработка сценария, от",
  },
  {
    id: "nfc",
    title: "NFC-карта",
    kind: "addon",
    description: "Бонус: физическая карта у стойки — касание открывает запись, отзыв, меню или каталог без поиска ссылки.",
    forWhom: "Полезно бизнесу с офлайн-точкой (кафе, салон, сервис).",
    priceModel: "bonus",
    price: 0,
    recurrence: "included",
    priceNote: "бонус к системе",
  },
];

export const PRODUCT_BY_ID = new Map(AEVIX_PRODUCTS.map((p) => [p.id, p]));

function formatKztPlain(n: number): string {
  return n.toLocaleString("ru-RU").replace(/ /g, " ");
}

/** Прайс-контекст для промпта AI-консультанта — из ОДНОЙ модели, чтобы бот не называл устаревшие
 *  цены и не путал канал с возможностью (единый источник, этап 7, Wave 4). */
export function productPriceContext(): string {
  return AEVIX_PRODUCTS.map((p) => {
    const price =
      p.priceModel === "included"
        ? "включено в основу"
        : p.priceModel === "bonus"
          ? "бонус"
          : p.priceModel === "custom"
            ? "по составу проекта"
            : `от ${formatKztPlain(p.price)} ₸`;
    return `- ${p.title} (${PRODUCT_KIND_LABEL[p.kind]}) — ${price}: ${p.description}`;
  }).join("\n");
}

/** Реальная акция одной строкой — из того же единственного числа. */
export const FIRST_PROJECT_DISCOUNT_LINE = `на первый проект действует реальная скидка ${Math.round(
  FIRST_PROJECT_DISCOUNT * 100,
)}% — называй её при вопросах о цене, это настоящее условие, а не маркетинговый приём`;

/**
 * Детерминированная niche-aware рекомендация: какие capability-возможности предложить и ПОЧЕМУ.
 * Объяснение выводится из сценария бизнеса (запись/заказы/заявки), а не из «AI считает, что 94%».
 * Каналы и ядро (AI) подразумеваются всегда — рекомендуем именно возможности поверх них.
 */
export type CapabilityRecommendation = { capabilityIds: string[]; reason: string };

const BOOKING_NICHES: NicheId[] = ["beauty", "barbershop", "dental", "medical", "auto", "pet", "fitness", "hotel"];
const ORDER_NICHES: NicheId[] = ["coffee", "restaurant", "bakery", "shop", "flowers", "perfume"];

export function recommendCapabilities(niche: NicheId): CapabilityRecommendation {
  if (BOOKING_NICHES.includes(niche)) {
    return {
      capabilityIds: ["automation", "crm"],
      reason: "В вашем сценарии есть запись клиентов — её ответы, подтверждения и напоминания автоматизируются напрямую.",
    };
  }
  if (ORDER_NICHES.includes(niche)) {
    return {
      capabilityIds: ["automation", "crm"],
      reason: "В вашем сценарии есть приём заказов — он собирается в единый поток со статусами и историей.",
    };
  }
  // legal/education/realestate/construction/cleaning/photo/generic — заявки и консультации.
  return {
    capabilityIds: ["crm"],
    reason: "Клиенты приходят с заявками и вопросами — их важно не терять и вести в одном контуре.",
  };
}
