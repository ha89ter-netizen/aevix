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

export type ProductKind = "core" | "capability" | "channel" | "product" | "addon";

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
  /** Короткая честная пометка семантики цены: «разово», «+50 000 ₸ к AI», «включено». */
  priceNote: string;
  /** Зависимость от другого продукта (Pricing pass). Telegram/WhatsApp — каналы AI-консультанта:
   *  сами по себе не продаются, работают ПОВЕРХ ядра. UI и калькулятор используют это, чтобы канал
   *  не выглядел самостоятельным дешёвым «ботом» вместо/наравне с ядром. */
  dependsOn?: string;
  /** Что реально входит в scope этого продукта (Pricing pass). Объявлено ДАННЫМИ, а не парой
   *  захардкоженных id в калькуляторе: комплексная автоматизация делает клиентский контур сама,
   *  поэтому выбранная рядом CRM — та же работа, и второй раз она не тарифицируется. */
  includesInScope?: string[];
};

/**
 * Включённое сопровождение — честная граница, не «поддержка всего подряд». ОДНА политика на все
 * оплачиваемые решения AEVIX (Pricing pass): чинит баги и вносит мелкие правки в рамках проекта,
 * но не делает новые крупные функции / редизайн / работы вне scope. Меняется в одном месте.
 */
export type IncludedSupport = {
  durationDays: number;
  /** Заголовок для UI, одной строкой. */
  summary: string;
  /** Что входит без доплаты в этот срок. */
  includes: string[];
  /** Что НЕ входит (границы scope) — чтобы не читалось как «любые изменения бесплатно». */
  excludes: string[];
};

/** Каноническая политика сопровождения — ОДИН источник, относится ко всем платным решениям. */
export const SUPPORT_POLICY: IncludedSupport = {
  durationDays: 30,
  summary: "30 дней сопровождения после сдачи — на все оплачиваемые решения",
  includes: [
    "исправление обнаруженных ошибок",
    "небольшие корректировки в рамках согласованного проекта",
  ],
  excludes: [
    "новые крупные функции и разделы",
    "полный редизайн после сдачи",
    "новые интеграции и работы вне согласованного объёма",
    "бесконечные правки",
  ],
};

/** Политика сопровождения относится к ОПЛАЧИВАЕМЫМ решениям (реальная цена > 0). Включённые каналы
 *  (Telegram) и бонусы (NFC) отдельным сопровождением не тарифицируются — они часть оплаченного. */
export function hasIncludedSupport(product: AevixProduct): boolean {
  return (product.priceModel === "from" || product.priceModel === "fixed") && product.price > 0;
}

/** Человекочитаемый ярлык категории для UI. */
export const PRODUCT_KIND_LABEL: Record<ProductKind, string> = {
  core: "Основа",
  capability: "Возможность",
  channel: "Канал",
  product: "Продукт",
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
    description: "Основа AI-автоматизации общения: понимает вопрос клиента, уточняет задачу и передаёт сотруднику уже готовое обращение.",
    forWhom: "Ядро для любого бизнеса — с него начинается автоматизация общения.",
    priceModel: "fixed",
    price: 120_000,
    recurrence: "one-time",
    priceNote: "разовая настройка",
  },
  {
    id: "site",
    title: "Сайт / лендинг",
    kind: "product",
    description: "Самостоятельный продукт — разработка сайта: рабочая точка входа, где клиент понимает услугу и оставляет заявку. При желании на страницу подключается AI-консультант.",
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
    description: "Канал AI-консультанта: тот же ассистент отвечает в Telegram. Входит в базовую стоимость AI-консультанта, отдельно не тарифицируется.",
    forWhom: "Если аудитория и заявки уже идут через Telegram.",
    priceModel: "included",
    price: 0,
    recurrence: "included",
    priceNote: "включён в AI-консультанта",
    dependsOn: "ai",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    kind: "channel",
    description: "Дополнительный канал AI-консультанта: тот же ассистент в WhatsApp. Business API требует верифицированный номер и провайдера — отсюда разовая доплата к ядру, а не отдельный AI-продукт.",
    forWhom: "Если клиенты привыкли писать именно в WhatsApp.",
    priceModel: "fixed",
    price: 50_000,
    recurrence: "one-time",
    priceNote: "+50 000 ₸ к AI-консультанту",
    dependsOn: "ai",
  },
  {
    id: "crm",
    title: "CRM",
    kind: "capability",
    description: "Клиенты, заявки, статусы и история взаимодействия в одном контуре — видно, где находится каждый клиент и заявка в процессе.",
    forWhom: "Когда данные о клиентах и заявках разбросаны по чатам, таблицам и заметкам.",
    priceModel: "fixed",
    price: 200_000,
    recurrence: "one-time",
    priceNote: "разовое внедрение",
  },
  {
    id: "automation",
    title: "Комплексная автоматизация",
    kind: "capability",
    description: "Индивидуальная система под конкретный бизнес: связывает несколько процессов и модулей в один сценарий, работающий без ручного контроля. Это не ещё одна CRM.",
    forWhom: "Когда процессов несколько и их нужно свести в одну систему.",
    priceModel: "from",
    price: 350_000,
    recurrence: "one-time",
    priceNote: "разработка сценария, от",
    // Индивидуальный контур строится вместе с клиентской базой и статусами — это и есть CRM-часть.
    includesInScope: ["crm"],
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

/**
 * Замыкание зависимостей выбранной конфигурации (Pricing pass): канал не существует без своего
 * ядра. Функция чистая и живёт ЗДЕСЬ, а не в калькуляторе, потому что это правило продукта, а не
 * деталь одного экрана: её обязаны применять и переключатель, и восстановление сохранённой
 * конфигурации проекта (иначе старый набор с «висячим» WhatsApp вернулся бы после перезагрузки).
 */
export function withDependencies(ids: string[]): string[] {
  const next = [...ids];
  for (const id of ids) {
    const dependsOn = PRODUCT_BY_ID.get(id)?.dependsOn;
    if (dependsOn && !next.includes(dependsOn)) next.push(dependsOn);
  }
  return next;
}

/**
 * Что из выбранного уже входит в scope другого выбранного продукта — и потому НЕ тарифицируется
 * второй раз (Pricing pass). Возвращает поглощённые id, а не готовую сумму: цену считает
 * калькулятор, а знание «эта работа уже внутри той» принадлежит продуктовой модели.
 */
export function absorbedByScope(ids: string[]): string[] {
  const selected = new Set(ids);
  const absorbed = new Set<string>();
  for (const id of ids) {
    for (const inner of PRODUCT_BY_ID.get(id)?.includesInScope ?? []) {
      if (inner !== id && selected.has(inner)) absorbed.add(inner);
    }
  }
  return [...absorbed];
}

function formatKztPlain(n: number): string {
  return n.toLocaleString("ru-RU").replace(/ /g, " ");
}

/** Прайс-контекст для промпта AI-консультанта — из ОДНОЙ модели, чтобы бот не называл устаревшие
 *  цены и не путал канал с возможностью (единый источник, этап 7, Wave 4). */
export function productPriceContext(): string {
  const lines = AEVIX_PRODUCTS.map((p) => {
    const price =
      p.priceModel === "included"
        ? "включено в AI-консультанта"
        : p.priceModel === "bonus"
          ? "бонус"
          : p.priceModel === "custom"
            ? "по составу проекта"
            : p.priceModel === "fixed"
              ? `${formatKztPlain(p.price)} ₸`
              : `от ${formatKztPlain(p.price)} ₸`;
    const dep = p.dependsOn ? " (канал AI-консультанта, не отдельный продукт)" : "";
    return `- ${p.title} (${PRODUCT_KIND_LABEL[p.kind]}) — ${price}${dep}: ${p.description}`;
  });
  lines.push(
    `- Сопровождение: ${SUPPORT_POLICY.summary}. Входит: ${SUPPORT_POLICY.includes.join(", ")}. Не входит: ${SUPPORT_POLICY.excludes.join(", ")}. Без круглосуточной поддержки.`,
  );
  return lines.join("\n");
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
