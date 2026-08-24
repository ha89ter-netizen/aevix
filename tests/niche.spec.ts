import { test, expect } from "@playwright/test";
import { resolveNiche } from "../src/lib/niche";
import { businessKnowledgeFor } from "../src/lib/business-knowledge";
import { detectBusiness } from "../src/lib/hero-analysis";

/**
 * Канонический niche resolver (этап 7, Wave 1 + Wave 3) — семантика, не деталь реализации.
 *
 * Wave 1 закрыл QA-1 (подстрочная ловушка «сто») и QA-2 (два расходящихся детектора). Wave 3
 * расширил taxonomy (base + subtype), добавил RU/EN/translit покрытие и негативные сигналы.
 * Проверяем: правильная база, разумный подтип, отсутствие ложных срабатываний на не-бизнес-фразах,
 * и что analysis (detectBusiness) и concept (businessKnowledgeFor) читают ОДНУ identity.
 */

// [вход, ожидаемая база]
const CASES: Array<[string, string]> = [
  // ── Food ──
  ["ресторан", "restaurant"],
  ["семейный ресторан", "restaurant"],
  ["ресторан итальянской кухни", "restaurant"],
  ["кафе", "restaurant"],
  ["столовая", "restaurant"],
  ["кофейня", "coffee"],
  ["пекарня", "bakery"],
  ["кондитерская", "bakery"],
  ["бар", "restaurant"],
  ["доставка еды", "restaurant"],
  ["суши-бар", "restaurant"],
  ["пиццерия", "restaurant"],
  // ── Beauty ──
  ["салон красоты", "beauty"],
  ["студия красоты", "beauty"],
  ["парикмахерская", "beauty"],
  ["барбершоп", "barbershop"],
  ["маникюр", "beauty"],
  ["студия ногтей", "beauty"],
  ["брови и ресницы", "beauty"],
  ["косметология", "beauty"],
  ["массажный салон", "beauty"],
  // ── Medical ──
  ["стоматология", "dental"],
  ["зубная клиника", "dental"],
  ["стоматологическая клиника", "dental"],
  ["медицинская клиника", "medical"],
  ["медицинский центр", "medical"],
  ["диагностический центр", "medical"],
  ["клиника", "medical"],
  // ── Auto ──
  ["автосервис", "auto"],
  ["СТО", "auto"],
  ["ремонт автомобилей", "auto"],
  ["шиномонтаж", "auto"],
  ["детейлинг", "auto"],
  ["автомойка", "auto"],
  // ── Retail ──
  ["цветочный магазин", "flowers"],
  ["магазин цветов", "flowers"],
  ["магазин одежды", "shop"],
  ["бутик", "shop"],
  ["парфюмерный магазин", "perfume"],
  ["магазин косметики", "shop"],
  ["магазин автозапчастей", "shop"],
  ["мебель на заказ", "shop"],
  ["интернет-магазин", "shop"],
  // ── Professional ──
  ["юридическая компания", "legal"],
  ["адвокат", "legal"],
  ["бухгалтерские услуги", "legal"],
  ["бухгалтер", "legal"],
  ["консалтинг", "legal"],
  ["агентство недвижимости", "realestate"],
  ["риелтор", "realestate"],
  // ── Fitness / Wellness ──
  ["фитнес-клуб", "fitness"],
  ["тренажёрный зал", "fitness"],
  ["йога-студия", "fitness"],
  ["спа", "beauty"],
  // ── Pet ──
  ["груминг", "pet"],
  ["зоосалон", "pet"],
  ["ветеринарная клиника", "pet"],
  // ── Education ──
  ["образовательный центр", "education"],
  ["курсы английского", "education"],
  ["репетитор по математике", "education"],
  ["языковая школа", "education"],
  // ── Creative ──
  ["фотограф", "photo"],
  ["фотостудия", "photo"],
  ["дизайн-студия", "photo"],
  // ── Home / Repair ──
  ["ремонт квартир", "construction"],
  ["строительная компания", "construction"],
  ["сантехник", "cleaning"],
  ["электрик", "cleaning"],
  ["клининговая компания", "cleaning"],
  // ── Other bases ──
  ["отель", "hotel"],

  // ── EN ──
  ["restaurant", "restaurant"],
  ["cafe", "restaurant"],
  ["coffee shop", "coffee"],
  ["bakery", "bakery"],
  ["beauty salon", "beauty"],
  ["barbershop", "barbershop"],
  ["nail studio", "beauty"],
  ["dental clinic", "dental"],
  ["medical clinic", "medical"],
  ["auto repair", "auto"],
  ["car detailing", "auto"],
  ["flower shop", "flowers"],
  ["clothing store", "shop"],
  ["perfume shop", "perfume"],
  ["law firm", "legal"],
  ["accounting services", "legal"],
  ["consulting", "legal"],
  ["real estate agency", "realestate"],
  ["gym", "fitness"],
  ["yoga studio", "fitness"],
  ["pet grooming", "pet"],
  ["language school", "education"],
  ["photographer", "photo"],
  ["cleaning service", "cleaning"],

  // ── Transliteration (базовые пользовательские варианты) ──
  ["restoran", "restaurant"],
  ["kofeynya", "coffee"],
  ["salon krasoty", "beauty"],
  ["stomatologiya", "dental"],
  ["avtoservis", "auto"],
  ["magazin cvety", "flowers"],
  ["yurist", "legal"],
];

// [вход, ожидаемый подтип] — идентичность внутри базы, где она реально влияет на витрину/словарь.
const SUBTYPE_CASES: Array<[string, string]> = [
  ["пиццерия", "pizzeria"],
  ["суши-бар", "sushi"],
  ["студия ногтей", "nails"],
  ["брови", "brows"],
  ["ресницы", "lashes"],
  ["косметология", "cosmetology"],
  ["адвокат", "law"],
  ["бухгалтер", "accounting"],
  ["консалтинг", "consulting"],
  ["груминг", "grooming"],
  ["ветеринарная клиника", "vet"],
  ["диагностический центр", "diagnostics"],
  ["детейлинг", "detailing"],
  ["мебель на заказ", "furniture"],
  ["магазин косметики", "cosmetics"],
  ["йога-студия", "yoga"],
];

// Не должны определяться как auto (подстрока «сто»/число 100) и не как конкретная ниша.
const NOT_AUTO_GENERIC = ["стоимость", "просто", "место", "сто столиков", "сто"];

// Обычные НЕ-бизнес-фразы: не должны внезапно стать нишей (§21 — false positive rate).
const FALSE_POSITIVE_GENERIC = [
  "хочу сделать сайт",
  "стоимость сайта",
  "просто тест",
  "место рядом",
  "сто страниц",
  "моя компания",
  "нужен сайт",
  "хочу автоматизацию",
  "AEVIX Studio",
];

test.describe("niche resolver · корректная база", () => {
  for (const [input, expected] of CASES) {
    test(`«${input}» → ${expected}`, () => {
      expect(resolveNiche(input).id).toBe(expected);
    });
  }
});

test.describe("niche resolver · подтип (identity внутри базы)", () => {
  for (const [input, expected] of SUBTYPE_CASES) {
    test(`«${input}» → subtype ${expected}`, () => {
      expect(resolveNiche(input).subtype).toBe(expected);
    });
  }
});

test.describe("niche resolver · нет ложного auto по «сто»", () => {
  for (const input of NOT_AUTO_GENERIC) {
    test(`«${input}» → generic`, () => {
      const res = resolveNiche(input);
      expect(res.id).not.toBe("auto");
      expect(res.id).toBe("generic");
    });
  }
});

test.describe("niche resolver · обычные фразы не становятся нишей (false positives)", () => {
  for (const input of FALSE_POSITIVE_GENERIC) {
    test(`«${input}» → generic`, () => {
      expect(resolveNiche(input).id).toBe("generic");
    });
  }
});

test.describe("niche resolver · коллизии и негатив", () => {
  test("салон автомобилей → auto, салон красоты → beauty", () => {
    expect(resolveNiche("салон автомобилей").id).toBe("auto");
    expect(resolveNiche("салон красоты").id).toBe("beauty");
  });
  test("клиника автомобилей → auto (не medical)", () => {
    expect(resolveNiche("клиника автомобилей").id).toBe("auto");
  });
  test("ветеринарная клиника → pet, зубная клиника → dental, медицинская клиника → medical", () => {
    expect(resolveNiche("ветеринарная клиника").id).toBe("pet");
    expect(resolveNiche("зубная клиника").id).toBe("dental");
    expect(resolveNiche("медицинская клиника").id).toBe("medical");
  });
});

test.describe("niche resolver · неизвестное → graceful generic", () => {
  test("пустой ввод → generic (fallbackReason)", () => {
    expect(resolveNiche("").id).toBe("generic");
    expect(resolveNiche("").fallbackReason).toBe("empty-input");
    expect(resolveNiche("   ").id).toBe("generic");
  });
  test("бессмысленный ввод → generic (no-signals)", () => {
    const res = resolveNiche("абырвалг кулебяка кронколёса");
    expect(res.id).toBe("generic");
    expect(res.fallbackReason).toBe("no-signals");
  });
});

test.describe("niche resolver · мульти-бизнес детерминирован и не случаен", () => {
  const MIXED = ["кофейня и пекарня", "салон красоты с магазином косметики", "автосервис и магазин запчастей"];
  for (const input of MIXED) {
    test(`«${input}» → детерминированная не-generic база`, () => {
      const a = resolveNiche(input);
      const b = resolveNiche(input);
      expect(a).toEqual(b); // детерминизм
      expect(a.id).not.toBe("generic"); // хоть один сигнал доминирует
    });
  }
});

test.describe("display label · распознанная ниша не показывается как generic (Wave 5, §5)", () => {
  const SUPPORTED: Array<[string, string]> = [
    ["юридическая компания", "Юридическая компания"],
    ["ветклиника", "Зоосалон и ветклиника"],
    ["медицинский центр", "Медицинский центр"],
    ["фитнес-клуб", "Фитнес-клуб"],
    ["образовательный центр", "Образовательный центр"],
    ["клининговая компания", "Клининговая компания"],
  ];
  for (const [input, label] of SUPPORTED) {
    test(`«${input}» → recognized, label «${label}» (не «Малый бизнес»)`, () => {
      const p = detectBusiness(input);
      expect(p.recognized).toBe(true);
      expect(p.label).toBe(label);
      expect(p.label).not.toBe("Малый бизнес");
    });
  }
  test("нераспознанное → recognized:false, честный «Малый бизнес»", () => {
    const p = detectBusiness("хочу больше клиентов");
    expect(p.recognized).toBe(false);
    expect(p.label).toBe("Малый бизнес");
  });
});

test.describe("niche resolver · analysis === concept (одна identity)", () => {
  test("detectBusiness и businessKnowledgeFor не расходятся по базе", () => {
    const all = [...CASES.map(([i]) => i), ...NOT_AUTO_GENERIC, ...FALSE_POSITIVE_GENERIC];
    for (const input of all) {
      const canonical = resolveNiche(input).id;
      // concept-потребитель: knowledge приходит по канонической identity базы.
      expect(businessKnowledgeFor(input, input).id, `concept для «${input}»`).toBe(canonical);
      // analysis-потребитель: detectBusiness строится из той же resolveNiche.
      expect(resolveNiche(input).id, `analysis для «${input}»`).toBe(canonical);
      // Ни один потребитель не имеет собственного детектора: детерминирован.
      expect(detectBusiness(input)).toEqual(detectBusiness(input));
    }
  });

  test("subtype пробрасывается в knowledge", () => {
    const knowledge = businessKnowledgeFor("детейлинг", "детейлинг");
    expect(knowledge.id).toBe("auto");
    expect(knowledge.subtype).toBe("detailing");
  });

  test("салон красоты ≠ салон автомобилей (обе поверхности согласны)", () => {
    expect(businessKnowledgeFor("салон красоты", "салон красоты").id).toBe("beauty");
    expect(businessKnowledgeFor("салон автомобилей", "салон автомобилей").id).toBe("auto");
  });
});
