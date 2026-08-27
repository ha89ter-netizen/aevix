import { test, expect } from "@playwright/test";
import {
  AEVIX_PRODUCTS,
  PRODUCT_BY_ID,
  PRODUCT_KIND_LABEL,
  FIRST_PROJECT_DISCOUNT,
  SUPPORT_POLICY,
  absorbedByScope,
  hasIncludedSupport,
  recommendCapabilities,
  withDependencies,
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
    // Каналы работают поверх ядра: Telegram включён в AI, WhatsApp — платная доплата К AI, не отдельный AI.
    expect(tg.priceModel).toBe("included");
    expect(tg.price).toBe(0);
    expect(tg.dependsOn).toBe("ai");
    expect(wa.price).toBeGreaterThan(0);
    expect(wa.dependsOn).toBe("ai");
    expect(wa.priceNote.toLowerCase()).toContain("к ai");
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

  test("есть и «от», и фиксированные, и включённые — не всё «по запросу»", () => {
    const models = new Set(AEVIX_PRODUCTS.map((p) => p.priceModel));
    expect(models.has("from")).toBe(true);
    expect(models.has("included")).toBe(true);
    expect(models.has("fixed")).toBe(true);
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

test.describe("AEVIX products · 30 дней сопровождения — на все оплачиваемые (Pricing pass)", () => {
  test("политика одна, 30 дней, относится ко всем ОПЛАЧИВАЕМЫМ решениям (не только к сайту)", () => {
    expect(SUPPORT_POLICY.durationDays).toBe(30);
    expect(SUPPORT_POLICY.summary).toContain("30");
    const paid = ["ai", "site", "whatsapp", "crm", "automation"];
    const notPaid = ["telegram", "nfc"];
    for (const id of paid) {
      expect(hasIncludedSupport(PRODUCT_BY_ID.get(id)!), `${id} — оплачиваемый, есть сопровождение`).toBe(true);
    }
    for (const id of notPaid) {
      // Telegram включён в ядро, NFC — бонус: отдельным сопровождением не тарифицируются.
      expect(hasIncludedSupport(PRODUCT_BY_ID.get(id)!), `${id} — не отдельно оплачиваемый`).toBe(false);
    }
    // Больше нет per-product поля includedSupport — источник один (SUPPORT_POLICY).
    for (const p of AEVIX_PRODUCTS) {
      expect((p as { includedSupport?: unknown }).includedSupport).toBeUndefined();
    }
  });

  test("границы честны: чинят баги и мелкие правки, а не «любые изменения бесплатно», без 24/7", () => {
    expect(SUPPORT_POLICY.includes.length).toBeGreaterThan(0);
    expect(SUPPORT_POLICY.excludes.length).toBeGreaterThan(0);
    const all = [SUPPORT_POLICY.summary, ...SUPPORT_POLICY.includes, ...SUPPORT_POLICY.excludes].join(" ").toLowerCase();
    for (const banned of ["24/7", "круглосуточ", "безлимит", "unlimited", "пожизнен", "мгновенн", "sla", "гаранти", "любые изменения бесплатно"]) {
      expect(all, `не должно содержать «${banned}»`).not.toContain(banned);
    }
    expect(SUPPORT_POLICY.excludes.join(" ").toLowerCase()).toMatch(/функц|редизайн|интеграц|объём|бесконечн/);
  });
});

test.describe("AEVIX products · новая ценовая модель (Pricing pass)", () => {
  test("AI 120k core; site от 100k; Telegram включён; WhatsApp +50k add-on; CRM 200k; Automation от 350k; NFC бонус", () => {
    const p = (id: string) => PRODUCT_BY_ID.get(id)!;
    expect(p("ai").price).toBe(120_000);
    expect(p("ai").kind).toBe("core");
    // Сайт — самостоятельный ПРОДУКT, не канал (в отличие от Telegram/WhatsApp).
    expect(p("site").kind).toBe("product");
    expect(p("site").priceModel).toBe("from");
    expect(p("site").price).toBe(100_000);
    expect(p("telegram").priceModel).toBe("included");
    expect(p("telegram").kind).toBe("channel");
    expect(p("whatsapp").kind).toBe("channel");
    expect(p("telegram").dependsOn).toBe("ai");
    expect(p("whatsapp").price).toBe(50_000);
    expect(p("whatsapp").priceModel).toBe("fixed");
    expect(p("whatsapp").dependsOn).toBe("ai");
    expect(p("crm").price).toBe(200_000);
    expect(p("crm").priceModel).toBe("fixed");
    expect(p("automation").priceModel).toBe("from");
    expect(p("automation").price).toBe(350_000);
    expect(p("nfc").priceModel).toBe("bonus");
  });

  test("Telegram/WhatsApp — каналы AI, не самостоятельные продукты; CRM ≠ Complex Automation", () => {
    // Каналы зависят от ядра.
    expect(PRODUCT_BY_ID.get("telegram")!.dependsOn).toBe("ai");
    expect(PRODUCT_BY_ID.get("whatsapp")!.dependsOn).toBe("ai");
    // WhatsApp дешевле ядра, но это НЕ отдельный AI — семантика add-on в описании/пометке.
    expect(PRODUCT_BY_ID.get("whatsapp")!.priceNote.toLowerCase()).toContain("к ai");
    // CRM и Automation — разные продукты по смыслу, без «двойного» названия одного и того же.
    const crm = PRODUCT_BY_ID.get("crm")!.description.toLowerCase();
    const auto = PRODUCT_BY_ID.get("automation")!.description.toLowerCase();
    expect(crm).not.toBe(auto);
    expect(auto).toContain("не ещё одна crm");
  });
});

test.describe("AEVIX products · категория продукта честна (Pricing pass §1)", () => {
  test("сайт — самостоятельный продукт, а НЕ канал AI; каналы — только Telegram и WhatsApp", () => {
    const site = PRODUCT_BY_ID.get("site")!;
    expect(site.kind).not.toBe("channel");
    expect(site.kind).toBe("product");
    // У самостоятельного продукта нет зависимости от ядра: сайт продаётся и без AI-консультанта.
    expect(site.dependsOn).toBeUndefined();
    // Каналы — ровно те, что работают поверх ядра, и каждый на него ссылается.
    const channels = AEVIX_PRODUCTS.filter((p) => p.kind === "channel").map((p) => p.id);
    expect(channels.sort()).toEqual(["telegram", "whatsapp"]);
    for (const id of channels) expect(PRODUCT_BY_ID.get(id)!.dependsOn, id).toBe("ai");
  });

  test("у каждой категории свой ярлык — «Продукт» не сливается с «Каналом»", () => {
    const labels = Object.values(PRODUCT_KIND_LABEL);
    expect(new Set(labels).size).toBe(labels.length);
    expect(PRODUCT_KIND_LABEL.product).not.toBe(PRODUCT_KIND_LABEL.channel);
  });
});

test.describe("AEVIX products · канал не существует без ядра (Pricing pass §2)", () => {
  test("WhatsApp и Telegram в конфигурации всегда доводятся до AI-ядра", () => {
    expect(withDependencies(["whatsapp"])).toContain("ai");
    expect(withDependencies(["telegram"])).toContain("ai");
    expect(withDependencies(["whatsapp", "telegram"])).toContain("ai");
    // Уже полная конфигурация не дублирует ядро.
    const full = withDependencies(["ai", "whatsapp"]);
    expect(full.filter((id) => id === "ai")).toHaveLength(1);
  });

  test("замыкание идемпотентно и не трогает независимые продукты", () => {
    const once = withDependencies(["whatsapp", "site"]);
    expect(withDependencies(once).sort()).toEqual(once.sort());
    // Сайт самостоятелен — ядро к нему не приклеивается.
    expect(withDependencies(["site"])).toEqual(["site"]);
    expect(withDependencies(["crm"])).toEqual(["crm"]);
  });
});

test.describe("AEVIX products · CRM внутри автоматизации не считается дважды (Pricing pass §3)", () => {
  test("CRM поглощается scope комплексной автоматизации, но только вместе с ней", () => {
    expect(absorbedByScope(["crm", "automation"])).toEqual(["crm"]);
    expect(absorbedByScope(["automation", "crm"])).toEqual(["crm"]);
    // Обратный переход: сняли автоматизацию — CRM снова самостоятельная работа.
    expect(absorbedByScope(["crm"])).toEqual([]);
    expect(absorbedByScope(["automation"])).toEqual([]);
    expect(absorbedByScope(["ai", "site", "whatsapp"])).toEqual([]);
  });

  test("CRM и автоматизация остаются РАЗНЫМИ продуктами со своими ценами", () => {
    // Поглощение — про счёт, а не про слияние продуктов: обе позиции живут в каталоге отдельно.
    expect(PRODUCT_BY_ID.get("crm")!.price).toBe(200_000);
    expect(PRODUCT_BY_ID.get("automation")!.price).toBe(350_000);
    expect(PRODUCT_BY_ID.get("automation")!.includesInScope).toContain("crm");
    // Обратной зависимости нет: CRM не «включает» автоматизацию.
    expect(PRODUCT_BY_ID.get("crm")!.includesInScope).toBeUndefined();
  });

  test("scope объявлен данными и ссылается на существующие продукты", () => {
    for (const p of AEVIX_PRODUCTS) {
      for (const id of p.includesInScope ?? []) {
        expect(PRODUCT_BY_ID.has(id), `${p.id}→${id}`).toBe(true);
        expect(id, "продукт не может входить сам в себя").not.toBe(p.id);
      }
    }
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
