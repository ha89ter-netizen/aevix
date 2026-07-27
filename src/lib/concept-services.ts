/**
 * Typical service catalogue with regional average prices, injected into a generated concept so
 * the "Цены" section is never an empty placeholder. Prices are rough SNG averages in tenge (₸)
 * and are explicitly framed as editable — the concept is a starting point, not a real menu.
 */

export type ConceptService = { name: string; price: string };
export type ConceptServiceCatalog = { items: ConceptService[]; note: string };

const NOTE = "Средние цены по региону — их можно изменить.";

const CATALOGS = {
  barbershop: [
    { name: "Мужская стрижка", price: "3 500 ₸" },
    { name: "Стрижка + борода", price: "5 500 ₸" },
    { name: "Моделирование бороды", price: "2 500 ₸" },
    { name: "Камуфляж седины", price: "4 000 ₸" },
    { name: "Детская стрижка", price: "3 000 ₸" },
    { name: "Отец + сын", price: "6 000 ₸" },
  ],
  beauty: [
    { name: "Маникюр с покрытием", price: "6 000 ₸" },
    { name: "Педикюр", price: "7 000 ₸" },
    { name: "Стрижка и укладка", price: "5 000 ₸" },
    { name: "Окрашивание", price: "12 000 ₸" },
    { name: "Брови + ламинирование", price: "5 000 ₸" },
    { name: "Макияж", price: "8 000 ₸" },
  ],
  coffee: [
    { name: "Эспрессо", price: "700 ₸" },
    { name: "Капучино", price: "1 200 ₸" },
    { name: "Латте", price: "1 300 ₸" },
    { name: "Раф", price: "1 500 ₸" },
    { name: "Круассан", price: "1 100 ₸" },
    { name: "Десерт дня", price: "1 800 ₸" },
  ],
  restaurant: [
    { name: "Бизнес-ланч", price: "3 500 ₸" },
    { name: "Основное блюдо", price: "4 500 ₸" },
    { name: "Паста / ризотто", price: "3 800 ₸" },
    { name: "Салаты", price: "2 800 ₸" },
    { name: "Десерты", price: "2 200 ₸" },
    { name: "Напитки", price: "1 200 ₸" },
  ],
  perfume: [
    { name: "Дизайнерский аромат", price: "28 000 ₸" },
    { name: "Нишевый парфюм, 50 мл", price: "45 000 ₸" },
    { name: "Селектив, 100 мл", price: "65 000 ₸" },
    { name: "Подарочный набор", price: "35 000 ₸" },
    { name: "Пробник / распив", price: "3 000 ₸" },
    { name: "Автопарфюм", price: "4 500 ₸" },
  ],
  shop: [
    { name: "Базовый верх", price: "9 000 ₸" },
    { name: "Рубашка", price: "14 000 ₸" },
    { name: "Джинсы / брюки", price: "18 000 ₸" },
    { name: "Верхняя одежда", price: "45 000 ₸" },
    { name: "Обувь", price: "32 000 ₸" },
    { name: "Аксессуары", price: "6 000 ₸" },
  ],
  fitness: [
    { name: "Разовое занятие", price: "3 000 ₸" },
    { name: "Абонемент на месяц", price: "20 000 ₸" },
    { name: "Персональная тренировка", price: "8 000 ₸" },
    { name: "Групповые классы", price: "25 000 ₸" },
    { name: "Сплит, 12 занятий", price: "60 000 ₸" },
    { name: "Годовой абонемент", price: "150 000 ₸" },
  ],
  dental: [
    { name: "Консультация", price: "3 000 ₸" },
    { name: "Профессиональная чистка", price: "18 000 ₸" },
    { name: "Лечение кариеса", price: "20 000 ₸" },
    { name: "Удаление зуба", price: "12 000 ₸" },
    { name: "Отбеливание", price: "60 000 ₸" },
    { name: "Имплантация", price: "от 250 000 ₸" },
  ],
  construction: [
    { name: "Выезд и замер", price: "бесплатно" },
    { name: "Дизайн-проект", price: "от 5 000 ₸/м²" },
    { name: "Черновая отделка", price: "от 25 000 ₸/м²" },
    { name: "Чистовая отделка", price: "от 45 000 ₸/м²" },
    { name: "Ремонт под ключ", price: "от 90 000 ₸/м²" },
    { name: "Строительство дома", price: "договорная" },
  ],
  auto: [
    { name: "Диагностика", price: "3 000 ₸" },
    { name: "Замена масла", price: "8 000 ₸" },
    { name: "Развал-схождение", price: "12 000 ₸" },
    { name: "Замена колодок", price: "15 000 ₸" },
    { name: "Шиномонтаж", price: "6 000 ₸" },
    { name: "ТО по регламенту", price: "от 20 000 ₸" },
  ],
  generic: [
    { name: "Базовая услуга", price: "от 5 000 ₸" },
    { name: "Стандартный пакет", price: "от 15 000 ₸" },
    { name: "Расширенный пакет", price: "от 30 000 ₸" },
    { name: "Индивидуальное решение", price: "по запросу" },
  ],
} satisfies Record<string, ConceptService[]>;

// First match wins — specific niches before broad ones (mirrors concept-images matching).
const MATCHERS: Array<[keyof typeof CATALOGS, string[]]> = [
  ["dental", ["стоматолог", "зуб", "дент", "dental", "ортодонт", "denta"]],
  ["barbershop", ["барбер", "стрижк", "бород"]],
  ["perfume", ["парфюм", "аромат", "sillage", "духи"]],
  ["beauty", ["салон", "красот", "маникюр", "ногт", "бров", "ресниц", "космет", "spa", "спа", "визаж", "макияж", "lumi"]],
  ["coffee", ["кофе", "кофейн", "roast", "бариста"]],
  ["restaurant", ["ресторан", "кафе", "бар", "пицц", "суши", "кухн", "еда", "food", "north"]],
  ["fitness", ["фитнес", "зал", "спорт", "трен", "gym", "fitness", "йога", "pulse"]],
  ["construction", ["строит", "строительн", "ремонт", "монолит", "monolith", "прораб", "отделк", "construct"]],
  ["auto", ["сто", "автосервис", "автосалон", "шином", "детейлинг", "ремонт авто", "ремонт машин", "auto", "car service"]],
  ["shop", ["магазин", "товар", "одежд", "бутик", "shop", "store", "маркет"]],
];

export function conceptServicesFor(businessType: string): ConceptServiceCatalog {
  const normalized = businessType.toLowerCase();
  for (const [key, keywords] of MATCHERS) {
    if (keywords.some((word) => normalized.includes(word))) return { items: CATALOGS[key], note: NOTE };
  }
  return { items: CATALOGS.generic, note: NOTE };
}
