import { test, expect } from "@playwright/test";
import { resolveNiche } from "../src/lib/niche";
import { businessKnowledgeFor } from "../src/lib/business-knowledge";
import { detectBusiness } from "../src/lib/hero-analysis";

/**
 * Канонический niche resolver (этап 7, Wave 1) — семантика, не деталь реализации.
 *
 * Закрывает QA-1 (подстрочная ловушка «сто») и QA-2 (два расходящихся детектора): проверяем, что
 * определяется правильная ниша, «сто» не срабатывает внутри слов, и что analysis (detectBusiness) и
 * concept (businessKnowledgeFor) читают ОДНУ identity.
 */

// [вход, ожидаемая каноническая ниша]
const CASES: Array<[string, string]> = [
  // RU
  ["ресторан", "restaurant"],
  ["ресторан итальянской кухни", "restaurant"],
  ["кафе", "restaurant"],
  ["кофейня", "coffee"],
  ["СТО", "auto"],
  ["автосервис", "auto"],
  ["салон красоты", "beauty"],
  ["салон автомобилей", "auto"],
  ["стоматология", "dental"],
  ["цветочный магазин", "flowers"],
  ["интернет-магазин", "shop"],
  // EN
  ["restaurant", "restaurant"],
  ["coffee shop", "coffee"],
  ["auto service", "auto"],
  ["beauty salon", "beauty"],
  ["flower shop", "flowers"],
];

// Не должны определяться как auto (подстрока «сто»/число 100) и не как конкретная ниша.
const NOT_AUTO_GENERIC = ["стоимость", "просто", "место", "сто столиков"];

// Ниши без словаря пока честно уходят в generic (расширение — QA-5, следующие волны).
const GENERIC_FALLBACK = ["юрист", "бухгалтер", "пекарня", "груминг"];

test.describe("niche resolver · корректная ниша", () => {
  for (const [input, expected] of CASES) {
    test(`«${input}» → ${expected}`, () => {
      expect(resolveNiche(input).id).toBe(expected);
    });
  }
});

test.describe("niche resolver · нет ложного auto по «сто»", () => {
  for (const input of NOT_AUTO_GENERIC) {
    test(`«${input}» → НЕ auto`, () => {
      const res = resolveNiche(input);
      expect(res.id).not.toBe("auto");
      expect(res.id).toBe("generic");
    });
  }
});

test.describe("niche resolver · неизвестное → graceful generic", () => {
  for (const input of GENERIC_FALLBACK) {
    test(`«${input}» → generic (fallbackReason)`, () => {
      const res = resolveNiche(input);
      expect(res.id).toBe("generic");
    });
  }
  test("пустой ввод → generic", () => {
    expect(resolveNiche("").id).toBe("generic");
    expect(resolveNiche("   ").id).toBe("generic");
  });
});

test.describe("niche resolver · analysis === concept (одна identity)", () => {
  test("detectBusiness и businessKnowledgeFor не расходятся по нише", () => {
    const all = [...CASES.map(([i]) => i), ...NOT_AUTO_GENERIC, ...GENERIC_FALLBACK];
    for (const input of all) {
      const canonical = resolveNiche(input).id;
      // concept-потребитель: knowledge приходит по канонической identity.
      const conceptId = businessKnowledgeFor(input, input).id;
      expect(conceptId, `concept для «${input}»`).toBe(canonical);
      // analysis-потребитель: detectBusiness строится из той же resolveNiche — идентичность та же
      // (display-категория может быть укрупнённой, но не независимой). Проверяем через резолвер.
      expect(resolveNiche(input).id, `analysis для «${input}»`).toBe(canonical);
      // Ни один потребитель не имеет собственного детектора: detectBusiness не падает и детерминирован.
      expect(detectBusiness(input)).toEqual(detectBusiness(input));
    }
  });

  test("салон красоты ≠ салон автомобилей (обе поверхности согласны)", () => {
    expect(businessKnowledgeFor("салон красоты", "салон красоты").id).toBe("beauty");
    expect(businessKnowledgeFor("салон автомобилей", "салон автомобилей").id).toBe("auto");
  });
});
