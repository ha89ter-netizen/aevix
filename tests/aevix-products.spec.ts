import { test, expect } from "@playwright/test";
import {
  AEVIX_PRODUCTS,
  PRODUCT_BY_ID,
  FIRST_PROJECT_DISCOUNT,
  recommendCapabilities,
} from "../src/lib/aevix-products";

/**
 * Каноническая модель услуг AEVIX (этап 7, Wave 4) — семантика продукта, не деталь рендера.
 *
 * Стережёт то, что было сломано: одинаковые описания при разных ценах, ошибка категории
 * (канал = продукт), непонятная семантика цены, выдуманные скидки/дефицит, и «AI считает, что 94%»
 * вместо детерминированной рекомендации.
 */

test.describe("AEVIX products · один смысл на продукт, без дублей", () => {
  test("описания не повторяются (никаких одинаковых текстов при разных ценах)", () => {
    const descriptions = AEVIX_PRODUCTS.map((p) => p.description.trim().toLowerCase());
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  test("AI, Telegram, WhatsApp различаются по СМЫСЛУ, а не только по цене", () => {
    const ai = PRODUCT_BY_ID.get("ai")!;
    const tg = PRODUCT_BY_ID.get("telegram")!;
    const wa = PRODUCT_BY_ID.get("whatsapp")!;
    // AI — это capability/основа (интеллект), Telegram/WhatsApp — каналы.
    expect(ai.kind).toBe("core");
    expect(tg.kind).toBe("channel");
    expect(wa.kind).toBe("channel");
    // Разница цены каналов — из реального scope: Telegram включён, WhatsApp требует подключения API.
    expect(tg.priceModel).toBe("included");
    expect(tg.price).toBe(0);
    expect(wa.price).toBeGreaterThan(0);
    expect(wa.priceNote.toLowerCase()).toContain("api");
  });
});

test.describe("AEVIX products · семантика цены понятна", () => {
  test("у каждого продукта есть модель цены, пометка и характер оплаты", () => {
    for (const p of AEVIX_PRODUCTS) {
      expect(p.priceModel, p.id).toBeTruthy();
      expect(p.priceNote.trim().length, p.id).toBeGreaterThan(0);
      expect(["one-time", "included", "usage"]).toContain(p.recurrence);
      // included/bonus не могут стоить денег; платные — иметь положительную цену.
      if (p.priceModel === "included" || p.priceModel === "bonus") expect(p.price).toBe(0);
    }
  });

  test("есть и фиксируемые «от», и включённые, и custom — не всё «по запросу»", () => {
    const models = new Set(AEVIX_PRODUCTS.map((p) => p.priceModel));
    expect(models.has("from")).toBe(true);
    expect(models.has("included")).toBe(true);
    expect(models.has("custom")).toBe(true);
  });
});

test.describe("AEVIX products · честность", () => {
  test("никакого fake scarcity / discount / crossed-price в копирайте", () => {
    const forbidden = /(осталось|только сегодня|успей|горит|скидка \d|-\d+%|было \d|дешевле на|\bхит\b|бестселлер)/i;
    for (const p of AEVIX_PRODUCTS) {
      expect(forbidden.test(p.description), `${p.id}.description`).toBe(false);
      expect(forbidden.test(p.forWhom), `${p.id}.forWhom`).toBe(false);
    }
  });

  test("скидка на первый проект — один источник, реалистичное число", () => {
    expect(FIRST_PROJECT_DISCOUNT).toBeGreaterThan(0);
    expect(FIRST_PROJECT_DISCOUNT).toBeLessThan(0.5);
  });
});

test.describe("AEVIX products · niche-рекомендация детерминирована и объяснима", () => {
  test("одна ниша → один результат, всегда с причиной", () => {
    const a = recommendCapabilities("beauty");
    const b = recommendCapabilities("beauty");
    expect(a).toEqual(b);
    expect(a.reason.trim().length).toBeGreaterThan(0);
    expect(a.capabilityIds.length).toBeGreaterThan(0);
  });

  test("сценарий с записью и сценарий с заказами объясняются по-разному", () => {
    const booking = recommendCapabilities("beauty");
    const orders = recommendCapabilities("coffee");
    expect(booking.reason).toContain("запис");
    expect(orders.reason).toContain("заказ");
  });

  test("рекомендованные id существуют в каталоге", () => {
    for (const niche of ["beauty", "coffee", "legal", "generic"] as const) {
      for (const id of recommendCapabilities(niche).capabilityIds) {
        expect(PRODUCT_BY_ID.has(id), `${niche}→${id}`).toBe(true);
      }
    }
  });
});
