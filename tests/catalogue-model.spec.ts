import { test, expect } from "@playwright/test";
import { businessKnowledgeFor } from "../src/lib/business-knowledge";
import { buildCatalogue, cataloguePreview, parsePrice, pluralItems } from "../src/lib/catalogue-model";

/**
 * Модель каталога (этап 5) — свойства системы обычным тестом, без браузера.
 *
 * Проверяет то, что должно сломаться, если каталог снова станет «плоский прайс дважды»:
 * семантика цены из реальных строк (без выдумки), реальные категории, превью-редукция ≠ префикс,
 * словарь ниши, отсутствие дублей, graceful для неизвестной ниши, честный featured.
 */

const nk = (type: string, name: string) => businessKnowledgeFor(type, name);

test.describe("каталог · семантика цены (без выдумки)", () => {
  test("разбирает точную, «от», диапазон, процент, бесплатно, по запросу", () => {
    expect(parsePrice("8 500 ₸")).toMatchObject({ kind: "exact", value: "8 500 ₸", amount: 8500 });
    expect(parsePrice("от 90 000 ₸")).toMatchObject({ kind: "from", lead: "от", value: "90 000 ₸", amount: 90000 });
    expect(parsePrice("бесплатно")).toMatchObject({ kind: "free", value: "Бесплатно" });
    expect(parsePrice("по запросу")).toMatchObject({ kind: "custom", value: "По запросу" });
    expect(parsePrice("10% в месяц")).toMatchObject({ kind: "percent", value: "10% в месяц" });
    expect(parsePrice("от 1% сделки")).toMatchObject({ kind: "percent", lead: "от", value: "1% сделки" });
    expect(parsePrice("1 500–2 500 ₸")).toMatchObject({ kind: "range" });
  });

  test("не превращает «от» в искусственно точное число", () => {
    const p = parsePrice("от 250 000 ₸");
    expect(p.kind).toBe("from");
    expect(p.lead).toBe("от");
  });
});

test.describe("каталог · категории и словарь ниши", () => {
  test("барбершоп: услуги, реальные категории, featured — комплекс", () => {
    const c = buildCatalogue(nk("Барбершоп", "FORMA"));
    expect(c.kind).toBe("services");
    expect(c.title).toBe("Услуги");
    expect(c.cta).toBe("Записаться");
    const labels = c.categories.map((x) => x.label);
    expect(labels).toEqual(expect.arrayContaining(["Стрижки", "Борода", "Комплексы", "Уход"]));
    // «Моделирование бороды» — в «Борода», а не в «Другое» (окончание не должно ломать классификацию).
    const beard = c.categories.find((x) => x.label === "Борода");
    expect(beard?.items.some((i) => i.name.includes("Моделирование"))).toBe(true);
    // Featured — честный signature (комплекс), а не выдуманная популярность.
    expect(c.featured?.name.toLowerCase()).toContain("комплекс");
  });

  test("ресторан: это МЕНЮ (позиции), а не «услуги»", () => {
    const c = buildCatalogue(nk("Ресторан", "TERRA"));
    expect(c.kind).toBe("menu");
    expect(c.title).toBe("Меню");
    expect(c.itemNoun).toBe("позиция");
  });

  test("автосервис: «Замена колодок» попадает в «Тормоза и ходовая»", () => {
    const c = buildCatalogue(nk("Другое", "Автосервис ТОРК"));
    const chassis = c.categories.find((x) => x.label === "Тормоза и ходовая");
    expect(chassis?.items.some((i) => i.name.toLowerCase().includes("колод"))).toBe(true);
  });

  test("словарь и CTA — на языке ниши, не один на всех", () => {
    expect(buildCatalogue(nk("Другое", "Цветочная мастерская FLORA")).cta).not.toBe(buildCatalogue(nk("Барбершоп", "F")).cta);
    expect(buildCatalogue(nk("Другое", "Стоматология ДЕНТА")).cta).toContain("приём");
  });
});

test.describe("каталог · превью ≠ полный каталог", () => {
  test("превью — редакционная выборка из разных категорий, а не первые N строк", () => {
    const c = buildCatalogue(nk("Барбершоп", "FORMA"));
    const preview = cataloguePreview(c, 3);
    // Меньше, чем весь каталог.
    expect(preview.signature.length).toBeLessThan(c.total);
    // Направления = реальные категории.
    expect(preview.directions.length).toBeGreaterThanOrEqual(3);
    // Не префикс: выбранные позиции приходят из РАЗНЫХ категорий (не первые N одной).
    const cats = new Set(preview.signature.map((i) => i.categoryId));
    expect(cats.size).toBeGreaterThanOrEqual(2);
    // Featured в превью присутствует.
    expect(preview.signature.some((i) => i.featured)).toBe(true);
    // Диапазон цен и CTA — для следующего шага.
    expect(preview.priceRange?.display).toContain("от");
    expect(preview.cta).toBeTruthy();
  });
});

test.describe("каталог · целостность и масштаб", () => {
  test("категории разбивают все позиции без потерь и без дублей", () => {
    for (const [type, name] of [["Барбершоп", "F"], ["Ресторан", "T"], ["Другое", "Автосервис"], ["Другое", "Стоматология"]] as const) {
      const c = buildCatalogue(nk(type, name));
      const inCats = c.categories.flatMap((x) => x.items);
      expect(inCats.length).toBe(c.total);
      expect(new Set(inCats.map((i) => i.id)).size).toBe(c.total); // без дублей id
    }
  });

  for (const n of [3, 6, 12, 30, 60]) {
    test(`${n} позиций: каталог собирается, категории покрывают всё`, () => {
      const services = Array.from({ length: n }, (_, i) => ({ name: `Услуга стрижка ${i + 1}`, price: `${(i + 1) * 1000} ₸` }));
      const c = buildCatalogue(nk("Барбершоп", "F"), { products: [], services });
      expect(c.total).toBe(n);
      expect(c.categories.flatMap((x) => x.items).length).toBe(n);
    });
  }

  test("неизвестная ниша: один чистый список, без монолитного шаблона и без падения", () => {
    const c = buildCatalogue(nk("Другое", "Космическая логистика XYZ"), {
      products: [],
      services: [{ name: "Запуск на орбиту", price: "по запросу" }, { name: "Стыковка", price: "от 1 000 000 ₸" }],
    });
    expect(c.categories.length).toBe(1);
    expect(c.total).toBe(2);
    expect(c.categories[0].items.length).toBe(2);
  });

  test("склонение счётчика позиций корректно", () => {
    expect(pluralItems(1, "услуга")).toBe("1 услуга");
    expect(pluralItems(3, "услуга")).toBe("3 услуги");
    expect(pluralItems(14, "услуга")).toBe("14 услуг");
    expect(pluralItems(21, "позиция")).toBe("21 позиция");
  });
});
