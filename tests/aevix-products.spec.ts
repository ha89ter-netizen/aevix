import { test, expect } from "@playwright/test";
import {
  AEVIX_PRODUCTS,
  PRODUCT_BY_ID,
  FIRST_PROJECT_DISCOUNT,
  recommendCapabilities,
} from "../src/lib/aevix-products";
import { CONCEPT_STATUS } from "../src/lib/concept-status";

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

test.describe("AEVIX products · 30 дней сопровождения (post-release 2)", () => {
  test("включённое сопровождение есть ТОЛЬКО у сайта, 30 дней", () => {
    const site = PRODUCT_BY_ID.get("site")!;
    expect(site.includedSupport?.durationDays).toBe(30);
    expect(site.includedSupport?.summary).toContain("30");
    // Другие продукты НЕ наследуют условие сайта.
    for (const p of AEVIX_PRODUCTS) {
      if (p.id !== "site") expect(p.includedSupport, `${p.id} не должен иметь includedSupport`).toBeUndefined();
    }
  });

  test("границы честны: чинят баги и мелкие правки, а не «любые изменения бесплатно»", () => {
    const s = PRODUCT_BY_ID.get("site")!.includedSupport!;
    // Есть и что входит, и что НЕ входит.
    expect(s.includes.length).toBeGreaterThan(0);
    expect(s.excludes.length).toBeGreaterThan(0);
    const all = [s.summary, ...s.includes, ...s.excludes].join(" ").toLowerCase();
    // Никаких запрещённых обещаний.
    for (const banned of ["24/7", "круглосуточ", "безлимит", "unlimited", "пожизнен", "мгновенн", "sla", "гаранти", "любые изменения бесплатно"]) {
      expect(all, `не должно содержать «${banned}»`).not.toContain(banned);
    }
    // Явно исключены крупные функции / редизайн / внешний scope.
    expect(s.excludes.join(" ").toLowerCase()).toMatch(/функц|редизайн|интеграц|объём/);
  });
});

test.describe("concept status · единый честный статус демо-концепта (post-release 2)", () => {
  test("ярлык «Демо-концепт» + объяснение про демо-данные, без обесценивания", () => {
    expect(CONCEPT_STATUS.badge.toLowerCase()).toContain("демо");
    const summary = CONCEPT_STATUS.summary.toLowerCase();
    expect(summary).toMatch(/пример|демонстрац/);
    expect(summary).toContain("цены");
    // Не обесцениваем концепт.
    for (const bad of ["плохая", "сырой", "мусор", "много багов", "простая версия"]) {
      expect(summary).not.toContain(bad);
    }
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
