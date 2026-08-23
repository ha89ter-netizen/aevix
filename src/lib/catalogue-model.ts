import type { BusinessKnowledge } from "./business-knowledge";
import type { ConceptOffer } from "./website-concept";

/**
 * Модель каталога услуг/цен (этап 5) — decision surface, а не прайс-таблица.
 *
 * Этап 4 был storytelling, этап 5 — принятие решения: посетитель сайта за секунды понимает, что
 * предлагает бизнес, как это устроено, сколько стоит, что главное и что делать дальше. Для этого
 * плоский `{name, price}` (business-knowledge / concept.offers) обогащается в СМЫСЛОВУЮ модель:
 * семантика цены, категории, словарь ниши, signature-акцент. Всё ДЕТЕРМИНИРОВАННО и без выдумки —
 * цены и слова только из уже имеющихся данных (в строках цен ниш уже есть «от», «по запросу»,
 * «бесплатно», «%»; словарь — `productsPageName`/`servicesTitle`/`ctas`).
 *
 * Слой чистый (без React): семантику можно проверить обычным тестом. Разные поверхности (превью на
 * главной, полный каталог) представляют ОДНУ эту модель по-разному — один источник, разная подача.
 */

/* ---- Семантика цены ---- */

export type PriceKind = "exact" | "from" | "range" | "percent" | "free" | "custom";

export type PriceDisplay = {
  kind: PriceKind;
  /** Приставка перед значением: «от». Пусто у точной цены. */
  lead?: string;
  /** Готовое к показу значение: «8 500 ₸», «Бесплатно», «По запросу», «10% в месяц». */
  value: string;
  /** Числовой ориентир для диапазона (минимум), если применимо. */
  amount?: number;
  raw: string;
};

const CURRENCY = "₸";

/**
 * Разбор строки цены в семантику. Ничего не придумывает: «от 90 000 ₸» → from, «по запросу» →
 * custom, «бесплатно» → free, «10% в месяц» → percent, «8 500 ₸» → exact. Если бизнес не дал точную
 * цену, интерфейс покажет «от…»/«По запросу», а не искусственно точное число.
 */
export function parsePrice(raw: string): PriceDisplay {
  const text = raw.trim();
  const low = text.toLowerCase();
  if (/бесплатн|free|включен/.test(low)) return { kind: "free", value: "Бесплатно", raw };
  if (/по запросу|договорн|индивидуальн|уточн|custom|обсужда/.test(low)) return { kind: "custom", value: "По запросу", raw };
  // startsWith, а не \b: у кириллицы нет ASCII word-boundary, поэтому /^от\b/ не срабатывает.
  const startsFrom = low.startsWith("от ");
  if (text.includes("%")) {
    return { kind: "percent", lead: startsFrom ? "от" : undefined, value: startsFrom ? text.replace(/^от\s+/i, "") : text, raw };
  }
  const amount = numericAmount(text);
  if (/[–—-]\s*\d/.test(text) && /\d\s*[–—-]/.test(text)) {
    return { kind: "range", value: text, amount, raw };
  }
  if (startsFrom) {
    return { kind: "from", lead: "от", value: text.replace(/^от\s+/i, ""), amount, raw };
  }
  return { kind: "exact", value: text, amount, raw };
}

/** Первое число в строке (пробелы-разделители тысяч убраны). null — если числа нет. */
function numericAmount(text: string): number | undefined {
  const m = text.replace(/ /g, " ").match(/\d[\d\s]*\d|\d/);
  if (!m) return undefined;
  const n = Number(m[0].replace(/\s/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/* ---- Категории по нише ---- */

type CategoryDef = { id: string; label: string; match: string[] };

/**
 * Реальные категории бизнеса (не «Популярное»/«Хит» ради UI). Ключи — корни слов из названий услуг
 * ниши. Есть не у каждой ниши: где определений нет, каталог показывается одним чистым списком —
 * ровно то, что позволяет новой нише работать без монолитного шаблона.
 */
const CATEGORY_DEFS: Record<string, CategoryDef[]> = {
  barbershop: [
    { id: "cuts", label: "Стрижки", match: ["стриж", "экспресс"] },
    { id: "beard", label: "Борода", match: ["бород", "бритьё", "бритье", "тонирован", "моделирован"] },
    { id: "combo", label: "Комплексы", match: ["комплекс", "vip", "отец"] },
    { id: "care", label: "Уход", match: ["уход", "укладк", "стайлинг", "камуфляж"] },
  ],
  beauty: [
    { id: "hair", label: "Волосы", match: ["стриж", "окраш", "укладк", "волос", "ламинир", "кератин"] },
    { id: "nails", label: "Ногти", match: ["маникюр", "педикюр", "ногт"] },
    { id: "brows", label: "Брови и ресницы", match: ["бров", "ресниц", "ламинир бров"] },
    { id: "care", label: "Уход", match: ["уход", "косметолог", "чистк", "массаж", "пилинг"] },
  ],
  dental: [
    { id: "diag", label: "Диагностика", match: ["консультац", "снимок", "диагностик"] },
    { id: "hygiene", label: "Гигиена", match: ["чистк", "гигиена", "air", "отбелив", "zoom"] },
    { id: "treat", label: "Лечение", match: ["кариес", "пульпит", "удаление"] },
    { id: "prosth", label: "Протезирование", match: ["винир", "коронк", "имплант", "брекет", "протез"] },
    { id: "kids", label: "Детям", match: ["детск"] },
  ],
  auto: [
    { id: "diag", label: "Диагностика", match: ["диагностик"] },
    { id: "service", label: "ТО и масла", match: ["масл", "фильтр", "то по", "регламент"] },
    { id: "chassis", label: "Тормоза и ходовая", match: ["развал", "колод", "тормоз", "диск", "грм", "ремень", "ходов", "подвеск", "амортизатор"] },
    { id: "detail", label: "Сервис", match: ["шиномонтаж", "кондиционер", "полировк", "химчистк", "детейл"] },
  ],
  restaurant: [
    { id: "starters", label: "Салаты и супы", match: ["салат", "суп", "борщ", "крем"] },
    { id: "mains", label: "Горячее", match: ["стейк", "лосось", "паста", "ризотто", "пицц", "плов", "манты", "бешбармак", "бургер"] },
    { id: "desserts", label: "Десерты", match: ["десерт", "чизкейк", "наполеон", "медовик", "тирамису"] },
    { id: "drinks", label: "Напитки", match: ["морс", "чай", "вин", "бокал", "лимонад", "напит", "кофе", "сок"] },
    { id: "sets", label: "Сеты", match: ["комплексн", "ужин", "ланч", "бронирован"] },
  ],
  coffee: [
    { id: "coffee", label: "Кофе", match: ["эспрессо", "американо", "капучино", "латте", "флэт", "раф", "кофе", "фильтр"] },
    { id: "drinks", label: "Напитки", match: ["чай", "матча", "лимонад", "какао"] },
    { id: "bakery", label: "Выпечка", match: ["круассан", "синнабон", "булочк", "выпечк"] },
    { id: "desserts", label: "Десерты", match: ["чизкейк", "тирамису", "медовик", "десерт"] },
    { id: "breakfast", label: "Завтраки", match: ["тост", "гранол", "яичниц", "сэндвич", "завтрак"] },
  ],
  flowers: [
    { id: "bouquets", label: "Букеты", match: ["букет", "розы", "пионы", "гортензии"] },
    { id: "compositions", label: "Композиции", match: ["композиц", "корзин", "коробк"] },
    { id: "plants", label: "Растения", match: ["растение", "кашпо"] },
    { id: "service", label: "Доставка и сервис", match: ["доставк", "открытк", "фото", "оформлен", "подписк"] },
    { id: "wedding", label: "Свадьбы", match: ["свадеб"] },
  ],
  realestate: [
    { id: "buy", label: "Покупка", match: ["подбор", "покупк", "ипотек"] },
    { id: "sell", label: "Продажа", match: ["продаж", "оценк"] },
    { id: "legal", label: "Сопровождение", match: ["сопровожд", "проверк", "юридич"] },
    { id: "rent", label: "Аренда", match: ["аренд", "сдача", "управлен"] },
  ],
};

/** Корни названий, по которым услуга — «signature» (флагманский пакет), а не популярность.
 *  Это редакционный акцент («Комплекс», «VIP»), НЕ выдуманное соц-доказательство. */
const SIGNATURE_ROOTS = ["комплекс", "vip", "под ключ", "подписк", "сет", "премиум", "premium", "signature", "авторский l", "ужин на"];

/* ---- Каталог ---- */

export type CatalogueKind = "menu" | "services" | "products" | "rooms";

export type CatalogueItem = {
  id: string;
  name: string;
  price: PriceDisplay;
  categoryId: string;
  featured: boolean;
};

export type CatalogueCategory = { id: string; label: string; items: CatalogueItem[] };

export type Catalogue = {
  kind: CatalogueKind;
  /** Заголовок раздела на языке ниши: «Меню» / «Каталог» / «Номера» / «Услуги». */
  title: string;
  /** Слово для одной позиции — для счётчиков и screen reader: «услуга»/«блюдо»/«товар»/«номер». */
  itemNoun: string;
  /** Призыв к действию из ниши: «Записаться» / «Заказать букет» / «Оставить заявку». */
  cta: string;
  categories: CatalogueCategory[];
  featured: CatalogueItem | null;
  /** Диапазон цен по числовым позициям — для превью и ориентира. null, если чисел нет. */
  priceRange: { min: number; display: string } | null;
  /** Данные демонстрационные (цены из базы знаний) — честная маркировка сохраняется. */
  demo: true;
  total: number;
};

const KIND_NOUN: Record<CatalogueKind, string> = { menu: "позиция", services: "услуга", products: "товар", rooms: "номер" };

function kindFor(knowledge: BusinessKnowledge, hasProducts: boolean): CatalogueKind {
  if (!hasProducts) return "services";
  const page = (knowledge.productsPageName ?? "").toLowerCase();
  if (page.includes("меню")) return "menu";
  if (page.includes("номер")) return "rooms";
  return "products";
}

function isSignature(name: string): boolean {
  const low = name.toLowerCase();
  return SIGNATURE_ROOTS.some((r) => low.includes(r));
}

function assignCategory(defs: CategoryDef[] | undefined, name: string): string {
  if (!defs) return "all";
  const low = name.toLowerCase();
  for (const def of defs) if (def.match.some((m) => low.includes(m))) return def.id;
  return "other";
}

/**
 * Собрать каталог из знаний ниши и (при наличии) собственных офферов проекта. Товарные ниши
 * (меню/каталог/номера) показывают продукты, сервисные — услуги: два списка никогда не сливаются.
 */
export function buildCatalogue(knowledge: BusinessKnowledge, offers?: { products: ConceptOffer[]; services: ConceptOffer[] }): Catalogue {
  const products = offers?.products ?? knowledge.products;
  const services = offers?.services ?? knowledge.services;
  const hasProducts = products.length > 0;
  const source = hasProducts ? products : services;
  const kind = kindFor(knowledge, hasProducts);
  const defs = CATEGORY_DEFS[knowledge.id];

  let featured: CatalogueItem | null = null;
  const items: CatalogueItem[] = source.map((offer, index) => {
    const item: CatalogueItem = {
      id: `${knowledge.id}-${index}`,
      name: offer.name,
      price: parsePrice(offer.price),
      categoryId: assignCategory(defs, offer.name),
      featured: false,
    };
    // Один signature-акцент на каталог — самый «пакетный»/старший. Честный редакционный акцент.
    if (!featured && isSignature(offer.name)) {
      item.featured = true;
      featured = item;
    }
    return item;
  });

  // Категории в порядке определений; пустые отбрасываем. Несопоставленные — в «Другое».
  const categories: CatalogueCategory[] = [];
  if (defs) {
    for (const def of defs) {
      const catItems = items.filter((i) => i.categoryId === def.id);
      if (catItems.length) categories.push({ id: def.id, label: def.label, items: catItems });
    }
    const other = items.filter((i) => i.categoryId === "other");
    if (other.length) categories.push({ id: "other", label: "Другое", items: other });
  } else {
    // Нет определений категорий — один чистый список. Новая ниша работает без шаблона.
    categories.push({ id: "all", label: knowledge.productsPageName ?? knowledge.servicesTitle, items });
  }

  const amounts = items.map((i) => i.price.amount).filter((n): n is number => typeof n === "number");
  const min = amounts.length ? Math.min(...amounts) : null;
  const priceRange = min === null ? null : { min, display: `от ${formatThousands(min)} ${CURRENCY}` };

  return {
    kind,
    title: hasProducts ? knowledge.productsPageName ?? "Каталог" : "Услуги",
    itemNoun: KIND_NOUN[kind],
    cta: knowledge.ctas.primary,
    categories,
    featured,
    priceRange,
    demo: true,
    total: items.length,
  };
}

function formatThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/* ---- Превью на главной: редакционное сокращение, НЕ префикс каталога ---- */

export type CataloguePreview = {
  /** Направления бизнеса (реальные категории), 3–4 — отвечает «чем занимается бизнес». */
  directions: string[];
  /** Signature-позиции: акцентная + по одной из первых категорий, БЕЗ повтора всего каталога. */
  signature: CatalogueItem[];
  priceRange: Catalogue["priceRange"];
  cta: string;
  itemNoun: string;
  total: number;
};

/**
 * Превью для главной. Отвечает «чем занимается бизнес», а не «вот весь прайс». Берёт направления
 * (категории) и по одной signature-позиции из разных категорий — это редакционное сокращение, а не
 * первые N строк каталога. Так главная и каталог перестают показывать один список дважды.
 */
export function cataloguePreview(catalogue: Catalogue, maxSignature = 3): CataloguePreview {
  const directions = catalogue.categories.map((c) => c.label).slice(0, 4);
  const signature: CatalogueItem[] = [];
  const seen = new Set<string>();
  if (catalogue.featured) {
    signature.push(catalogue.featured);
    seen.add(catalogue.featured.id);
  }
  // Сначала по одной позиции из разных категорий — показывает РАЗБРОС направлений, а не начало
  // списка (редакционная выборка вместо первых N).
  for (const category of catalogue.categories) {
    if (signature.length >= maxSignature) break;
    const pick = category.items.find((i) => !seen.has(i.id));
    if (pick) {
      signature.push(pick);
      seen.add(pick.id);
    }
  }
  // Затем добираем до maxSignature из оставшихся: у услуг категорий часто нет (одна группа), и без
  // добора превью схлопывалось бы в одну-две позиции — на внутренней странице услуг этого мало и
  // реальные услуги (напр. кейтеринг) пропадали (QA-13). Разброс уже задан первым проходом.
  if (signature.length < maxSignature) {
    for (const item of catalogue.categories.flatMap((c) => c.items)) {
      if (signature.length >= maxSignature) break;
      if (!seen.has(item.id)) {
        signature.push(item);
        seen.add(item.id);
      }
    }
  }
  return { directions, signature, priceRange: catalogue.priceRange, cta: catalogue.cta, itemNoun: catalogue.itemNoun, total: catalogue.total };
}

/** Плоский счётчик позиций каталога — для «N услуг» в превью и заголовке. */
export function pluralItems(n: number, noun: string): string {
  // Простое согласование для «услуга/услуги/услуг», «позиция/позиции/позиций», «товар/товара/товаров», «номер/номера/номеров».
  const forms: Record<string, [string, string, string]> = {
    услуга: ["услуга", "услуги", "услуг"],
    позиция: ["позиция", "позиции", "позиций"],
    товар: ["товар", "товара", "товаров"],
    номер: ["номер", "номера", "номеров"],
  };
  const f = forms[noun] ?? [noun, noun, noun];
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${f[0]}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${f[1]}`;
  return `${n} ${f[2]}`;
}
