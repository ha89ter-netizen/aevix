import { test, expect, type Page } from "@playwright/test";
import { buildFallbackWebsiteConcept, validateWebsiteConceptInput, type WebsiteConcept } from "../src/lib/website-concept";

/**
 * Каталог как decision surface (этап 5) — свойства в реальном браузере.
 *
 * Разные ниши (услуги/меню), любая ширина без переполнения и обрезки, ключевые названия не режутся
 * и не переносятся дефисом, порядок в DOM «имя → цена» (screen reader), рельс категорий доступен с
 * клавиатуры, честная маркировка демо. Плюс: превью главной НЕ равно полному каталогу.
 */

function seedConcept(concept: WebsiteConcept, id: string) {
  const now = 1_700_000_000_000;
  const project = {
    id, name: concept.businessName, businessType: concept.businessType, businessDescription: "", city: "Астана",
    preferredStyleIds: [], preferredColorIds: [], goals: [], sections: [], wishes: "",
    generatedAt: now, publishedAt: null, designerLog: [], editHistory: [], redoHistory: [],
    analysis: null, design: concept, pricing: null, createdAt: now, updatedAt: now, favorite: false,
  };
  return JSON.stringify({ version: 1, projects: [project] });
}

function makeConcept(businessType: string, businessName: string, styleId = "editorial", offers?: WebsiteConcept["offers"]) {
  const input = validateWebsiteConceptInput({
    businessType, businessName, styleId, colorIds: ["purple"], customColors: "",
    goals: ["Показывать услуги", "Записывать клиентов"],
    sections: ["services", "pricing", "about", "contacts"], wishes: "",
  });
  if (!input) throw new Error("bad input");
  const concept = buildFallbackWebsiteConcept(input);
  if (offers) concept.offers = offers;
  return concept;
}

async function openCatalogue(page: Page, concept: WebsiteConcept, id: string) {
  await page.addInitScript(([k, v]) => window.localStorage.setItem(k as string, v as string), ["aevix.projects", seedConcept(concept, id)]);
  await page.goto(`/app/projects/${id}/design`, { waitUntil: "networkidle" });
  await page.waitForSelector(".concept-hero", { timeout: 20_000 });
  // Каталог живёт на внутренней странице (услуги/меню). Обходим все пункты навигации концепта, пока
  // каталог не появится — надёжнее, чем угадывать ярлык страницы.
  const navButtons = page.locator(".concept-site .concept-nav nav button, .concept-site .concept-nav nav a");
  const catalogue = page.locator(".concept-catalogue");
  // Клик во время гидратации теряется (server-разметка кликабельна до навешивания обработчиков),
  // поэтому весь обход навигации — под toPass: повторяем, пока каталог не появится.
  await expect(async () => {
    const n = await navButtons.count();
    for (let i = 0; i < n; i++) {
      await navButtons.nth(i).click();
      if (await catalogue.count()) return;
    }
    throw new Error("catalogue not reached yet");
  }).toPass({ timeout: 25_000, intervals: [400, 800, 1500] });
}

const hOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("каталог · адаптив без переполнения и обрезки", () => {
  for (const [name, w] of [["mobile", 390], ["tablet", 820], ["desktop", 1280]] as const) {
    test(`${name} (${w}px): нет h-overflow, названия не обрезаны`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await openCatalogue(page, makeConcept("Барбершоп", "FORMA"), `cat-${w}`);
      expect(await hOverflow(page)).toBeLessThanOrEqual(1);
      const bad = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(".concept-catalogue-row-name, .concept-catalogue-featured-name")) {
          const cs = getComputedStyle(el);
          if (el.scrollWidth - el.clientWidth > 1) out.push(`overflow:${el.textContent}`);
          if (cs.textOverflow === "ellipsis") out.push(`ellipsis:${el.textContent}`);
          if (cs.hyphens === "auto") out.push(`hyphens:${el.textContent}`);
        }
        return out;
      });
      expect(bad).toEqual([]);
    });
  }

  test("длинные названия RU/EN/KZ не ломают цену и не создают overflow (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const offers = {
      products: [],
      services: [
        { name: "Комплексное восстановление и реконструкция сильно повреждённых волос", price: "от 25 000 ₸" },
        { name: "Comprehensive rejuvenating hair reconstruction and deep repair treatment", price: "от 25 000 ₸" },
        { name: "Қатты зақымдалған шаштарды кешенді қалпына келтіру және реконструкциялау", price: "от 25 000 ₸" },
        { name: "Стрижка", price: "3 500 ₸" },
      ],
    };
    await openCatalogue(page, makeConcept("Салон красоты", "LUMIERE", "editorial", offers), "cat-long");
    expect(await hOverflow(page)).toBeLessThanOrEqual(1);
    // Цена каждой строки помещается целиком (валюта не оторвалась, число не переносится).
    const priceOk = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".concept-catalogue-row-price")].every((el) => el.scrollWidth - el.clientWidth <= 1),
    );
    expect(priceOk).toBe(true);
  });
});

test.describe("каталог · доступность и честность", () => {
  test("в DOM имя идёт перед ценой — screen reader читает «услуга — цена»", async ({ page }) => {
    await openCatalogue(page, makeConcept("Барбершоп", "FORMA"), "cat-sr");
    const ok = await page.evaluate(() =>
      [...document.querySelectorAll(".concept-catalogue-row")].every((row) => {
        const name = row.querySelector(".concept-catalogue-row-name");
        const price = row.querySelector(".concept-catalogue-row-price");
        if (!name || !price) return false;
        // Позиция имени в DOM раньше цены.
        return !!(name.compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING);
      }),
    );
    expect(ok).toBe(true);
    // Семантика: категории — список; позиции — список.
    expect(await page.locator(".concept-catalogue-list").first().evaluate((e) => e.tagName)).toBe("UL");
  });

  test("рельс категорий доступен с клавиатуры (ссылки-якоря в фокусе)", async ({ page }) => {
    await openCatalogue(page, makeConcept("Барбершоп", "FORMA"), "cat-kb");
    const rail = page.locator(".concept-catalogue-rail a").first();
    await rail.focus();
    expect(await rail.evaluate((el) => el === document.activeElement)).toBe(true);
    // Ссылка ведёт к секции категории (якорь существует в DOM).
    const href = await rail.getAttribute("href");
    expect(href).toMatch(/^#cat-/);
    expect(await page.locator(`${href}`).count()).toBe(1);
  });

  test("демо-маркировка на месте — это не «реальная цена»", async ({ page }) => {
    await openCatalogue(page, makeConcept("Барбершоп", "FORMA"), "cat-demo");
    await expect(page.locator(".concept-catalogue .concept-demo-chip")).toBeVisible();
    await expect(page.getByText(/Демонстрационные цены/i)).toBeVisible();
  });
});

test.describe("каталог · превью главной ≠ полный каталог", () => {
  test("на главной услуг МЕНЬШЕ, чем в каталоге, и есть переход «все услуги»", async ({ page }) => {
    const concept = makeConcept("Барбершоп", "FORMA");
    await page.addInitScript(([k, v]) => window.localStorage.setItem(k as string, v as string), ["aevix.projects", seedConcept(concept, "cat-prev")]);
    await page.goto(`/app/projects/cat-prev/design`, { waitUntil: "networkidle" });
    await page.waitForSelector(".concept-hero", { timeout: 20_000 });
    // Главная: превью услуг + переход. Считаем позиции превью.
    const previewCount = await page.locator(".concept-services .concept-service-list li, .concept-services .concept-service-cards article, .concept-services .concept-service-columns article, .concept-services .concept-service-feature article").count();
    await expect(page.locator(".concept-services-viewall")).toBeVisible();
    await expect(page.locator(".concept-services-preview-meta")).toBeVisible();
    // Переходим в каталог и считаем полный список.
    await openCatalogue(page, concept, "cat-prev");
    const fullCount = await page.locator(".concept-catalogue-row").count();
    expect(previewCount).toBeGreaterThan(0);
    expect(fullCount).toBeGreaterThan(previewCount);
  });
});
