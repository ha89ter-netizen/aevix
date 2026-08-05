import { businessKnowledgeFor } from "./business-knowledge";
import type { ConceptGoal, ConceptSectionType } from "./website-concept";

/**
 * Рекомендуемая структура сайта: из ниши и названных целей, без обращения к модели.
 *
 * Почему без модели. Запрос к ней на этом шаге стоил бы 10–20 секунд ожидания посреди брифа
 * ради того, что мы и так знаем: у кофейни есть меню, у барбершопа нет, а «записывать
 * клиентов» требует раздела записи. Тратить время человека на подтверждение очевидного —
 * плохой размен.
 *
 * Отсюда прямое следствие для текстов интерфейса: это НЕ «AI понял ваш бизнес» и не «AI
 * проанализировал». Модель здесь не вызывается, и говорить обратное — врать. Правильные слова:
 * «AEVIX предлагает структуру на основе типа бизнеса и выбранных целей».
 *
 * Результат — предложение, а не приговор: человек удаляет, переименовывает, переставляет и
 * добавляет разделы, и в генерацию уходит именно его версия.
 */

export type StructureSection = {
  type: ConceptSectionType;
  /** Название раздела. Предзаполнено по нише, но человек волен переписать. */
  title: string;
};

/** Порядок, в котором разделы читаются на сайте: сначала предложение, в конце — как связаться. */
const ORDER: ConceptSectionType[] = [
  "services",
  "pricing",
  "gallery",
  "about",
  "reviews",
  "booking",
  "faq",
  "contacts",
];

/** Названия по умолчанию, когда ниша ничего своего не подсказывает. */
const DEFAULT_TITLES: Record<ConceptSectionType, string> = {
  services: "Услуги",
  pricing: "Цены",
  about: "О компании",
  gallery: "Галерея",
  reviews: "Отзывы",
  booking: "Запись",
  contacts: "Контакты",
  faq: "Вопросы и ответы",
};

/**
 * Строит структуру. Ниша задаёт основу и названия, цели добавляют разделы поверх.
 *
 * Разные ниши и цели обязаны давать заметно разные наборы — иначе шаг превращается в
 * декорацию. Кофейня с целью «продавать товары» получает «Меню», барбершоп с «записывать
 * клиентов» — «Запись», и это не одна и та же восьмёрка галочек.
 */
export function recommendStructure(
  businessType: string,
  businessName: string,
  goals: ConceptGoal[],
): StructureSection[] {
  const knowledge = businessKnowledgeFor(businessType, businessName);
  const hasProducts = knowledge.products.length > 0;
  const has = (goal: ConceptGoal) => goals.includes(goal);

  const titles: Partial<Record<ConceptSectionType, string>> = {};
  const chosen = new Set<ConceptSectionType>();
  const add = (type: ConceptSectionType, title?: string) => {
    chosen.add(type);
    if (title && !titles[type]) titles[type] = title;
  };

  // Основа: без «о компании» и «контактов» сайта не бывает ни у кого.
  // Просто «О компании», без попыток склонять название ниши: «О барбершоп» и «О автосервис»
  // — это не по-русски, а правильные падежи потребовали бы словаря ради одной строки.
  add("about", "О компании");
  add("contacts");

  // Что бизнес предлагает. У ниши с товарами каталог называется по-своему («Меню», «Номера»),
  // и это единственное место, где название раздела берётся из ниши, а не из общего списка.
  if (hasProducts) {
    add("pricing", knowledge.productsPageName ?? "Каталог");
    add("services", knowledge.servicesTitle);
  } else {
    add("services", knowledge.servicesTitle);
    // Просто «Цены»: раздел услуг здесь уже есть и стоит строкой выше, поэтому «Цены и услуги»
    // повторяло его слово в слово — человек видел в структуре два почти одинаковых названия и
    // не понимал, чем они отличаются. Названия должны различаться по смыслу: что делаем —
    // «Услуги», сколько стоит — «Цены».
    add("pricing", "Цены");
  }

  // Цели поверх основы.
  if (has("Записывать клиентов")) add("booking");
  if (has("Показывать услуги")) add("services", knowledge.servicesTitle);
  if (has("Показывать каталог") || has("Продавать товары")) {
    add("pricing", hasProducts ? knowledge.productsPageName ?? "Каталог" : "Цены");
  }
  if (has("Вызывать доверие")) {
    add("reviews");
    add("gallery");
  }
  if (has("Получать заявки")) add("pricing");

  // Вопросы снимают половину обращений и уместны почти всегда — но их легко удалить.
  add("faq");

  return ORDER.filter((type) => chosen.has(type)).map((type) => ({
    type,
    title: titles[type] ?? DEFAULT_TITLES[type],
  }));
}

/** Разделы, которых в структуре ещё нет, — для кнопки «добавить раздел». */
export function availableSections(structure: StructureSection[]): Array<{ type: ConceptSectionType; title: string }> {
  const present = new Set(structure.map((section) => section.type));
  return ORDER.filter((type) => !present.has(type)).map((type) => ({ type, title: DEFAULT_TITLES[type] }));
}
