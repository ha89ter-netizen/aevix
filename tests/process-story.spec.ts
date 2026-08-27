import { test, expect, type Page } from "@playwright/test";

/**
 * «Процесс» как визуальная история — свойства системы, а не скриншот.
 *
 * Проверяет: разные бизнесы дают разные истории (разные типы сцен), любая длина 3/4/5/6/7/10
 * раскладывается без сироты и без горизонтального переполнения, заголовки не режутся и не
 * переносятся дефисом, честная маркировка «Предложение AEVIX» на месте, а при reduced-motion
 * страница остаётся полностью читаемой. Порядок семантический (ol/li).
 */

type Flow = string[];

function seed(flow: Flow, businessType: string, id: string) {
  const n = 1_700_000_000_000;
  const analysis = {
    shortAnswer: "Да.",
    reasons: ["Обращения повторяются"],
    recommendedSolution: "Автоматизировать приём.",
    summary: "Поток обращений.",
    problems: ["Заявки теряются между каналами"],
    recommendations: ["Собрать входящие", "Подключить AI-приём", "Добавить напоминания"],
    flow,
    callToAction: "Обсудим через WhatsApp.",
  };
  const project = {
    id,
    name: id.toUpperCase(),
    businessType,
    businessDescription: "",
    city: "Астана",
    preferredStyleIds: [],
    preferredColorIds: [],
    goals: [],
    sections: [],
    wishes: "",
    generatedAt: n,
    publishedAt: null,
    designerLog: [],
    editHistory: [],
    redoHistory: [],
    analysis,
    design: null,
    pricing: null,
    createdAt: n,
    updatedAt: n,
    favorite: false,
  };
  return JSON.stringify({ version: 1, projects: [project] });
}

const BUSINESSES: Record<string, Flow> = {
  salon: ["Клиент пишет в WhatsApp", "Запрос разобран на детали", "Проверяется расписание", "Создаётся запись", "Клиент получает подтверждение", "Мастер видит запись"],
  auto: ["Клиент оставляет заявку", "Заявка зафиксирована", "Согласуется время визита", "Оформляется заказ-наряд", "Клиент получает уведомление", "Работа передаётся мастеру"],
  cafe: ["Гость делает заказ", "Состав заказа определён", "Проверяется наличие", "Оплата принята", "Заказ передаётся на кухню", "Готовый заказ выдан гостю"],
  clinic: ["Клиент оставляет обращение", "Обращение разобрано", "Подбирается время приёма", "Готовится документ", "Клиент получает напоминание", "Врач принимает пациента"],
};

async function open(page: Page, flow: Flow, businessType = "Салон красоты", id = "proc") {
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    ["aevix.projects", seed(flow, businessType, id)],
  );
  await page.goto(`/app/projects/${id}/workflow`, { waitUntil: "networkidle" });
  await page.waitForSelector(".process-card", { timeout: 20_000 });
}

async function cardTypes(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll(".process-card")].map((c) => c.getAttribute("data-type")));
}
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe("процесс · разные бизнесы — разные истории", () => {
  test("четыре ниши дают разные последовательности сцен, а не одну с заменой слов", async ({ page }) => {
    const seqs: Record<string, string[]> = {};
    for (const [key, flow] of Object.entries(BUSINESSES)) {
      await open(page, flow, key, key);
      seqs[key] = (await cardTypes(page)) as string[];
      // Каждая история осмысленно разнотипна (не всё в один тип).
      expect(new Set(seqs[key]).size, `${key}: минимум 4 разных сцены`).toBeGreaterThanOrEqual(4);
      // И ни одна сцена не доминирует: «одна композиция шесть раз» — запрещённый анти-паттерн.
      // Считаем самый частый тип; в шести шагах он не должен повторяться больше двух раз.
      const counts = seqs[key].reduce<Record<string, number>>((m, t) => ((m[t!] = (m[t!] ?? 0) + 1), m), {});
      const maxRepeat = Math.max(...Object.values(counts));
      expect(maxRepeat, `${key}: сцена не повторяется больше 2 раз`).toBeLessThanOrEqual(2);
    }
    // Истории различаются между нишами (иначе это один шаблон).
    const joined = Object.values(seqs).map((s) => s.join(">"));
    expect(new Set(joined).size).toBeGreaterThan(1);
  });
});

test.describe("процесс · динамическая длина", () => {
  for (const n of [3, 4, 5, 6, 7, 10]) {
    test(`${n} этапов: раскладка без сироты, без h-overflow`, async ({ page }) => {
      const flow = Array.from({ length: n }, (_, i) =>
        ["Клиент пишет", "Заявка зафиксирована", "Проверяется расписание", "Оплата принята", "Клиент уведомлён", "Готовится документ", "Работа передаётся мастеру", "Собран отзыв", "Обновлены остатки", "Процесс завершён"][i % 10],
      );
      await open(page, flow, "Салон красоты", `len-${n}`);
      expect(await page.locator(".process-card").count()).toBe(n);
      // Первая — ведущая (широкая), половинных карточек чётное число.
      const wide = await page.evaluate(() => [...document.querySelectorAll(".process-card")].map((c) => c.classList.contains("is-wide")));
      expect(wide[0]).toBe(true);
      expect(wide.filter((w) => !w).length % 2).toBe(0);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("процесс · адаптив без переполнения и обрезки", () => {
  for (const [name, w] of [["mobile", 390], ["tablet", 820], ["desktop", 1280]] as const) {
    test(`${name} (${w}px): нет h-overflow, заголовки не обрезаны`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await open(page, BUSINESSES.salon, "Салон красоты", `rw-${w}`);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      const clip = await page.evaluate(() => {
        const bad: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(".process-card-title")) {
          const cs = getComputedStyle(el);
          if (el.scrollWidth - el.clientWidth > 1) bad.push(`overflow:${el.textContent}`);
          if (cs.textOverflow === "ellipsis") bad.push(`ellipsis:${el.textContent}`);
          if (cs.hyphens === "auto") bad.push(`hyphens:${el.textContent}`);
          if (parseFloat(cs.fontSize) < 16) bad.push(`tiny:${el.textContent}`);
        }
        return bad;
      });
      expect(clip).toEqual([]);
      // Иллюстрация остаётся крупной и на мобильном (не icon+12px): её высота ощутима.
      const illuH = await page.locator(".process-card-illu").first().evaluate((e) => e.getBoundingClientRect().height);
      expect(illuH).toBeGreaterThan(120);
    });
  }
});

test.describe("процесс · структура, честность, доступность", () => {
  test("семантический порядок: ol со списком шагов, ровно один h1 на странице", async ({ page }) => {
    await open(page, BUSINESSES.salon);
    await expect(page.locator("ol.process-grid")).toHaveCount(1);
    expect(await page.locator(".process-grid > li").count()).toBe(BUSINESSES.salon.length);
    // Заголовок документа на странице ровно один — его объявляет оболочка. Раздел «Процесс»
    // приносил второй, и страница получала два h1; теперь его собственный заголовок — h2, а
    // заголовки карточек — h3, то есть иерархия не рвётся.
    expect(await page.locator("h1").count()).toBe(1);
    expect(await page.locator(".process-story h1").count()).toBe(0);
    expect(await page.locator(".process-story h2.process-title").count()).toBe(1);
  });

  test("маркировка: это предложение AEVIX, а не реальные данные клиента", async ({ page }) => {
    await open(page, BUSINESSES.salon);
    await expect(page.getByText("Предложение AEVIX")).toBeVisible();
    await expect(page.getByText(/по итогам AI-анализа/i)).toBeVisible();
  });

  test("подпись не дублирует заголовок ни на одной карточке", async ({ page }) => {
    await open(page, BUSINESSES.clinic, "Клиника", "dup");
    const dup = await page.evaluate(() =>
      [...document.querySelectorAll(".process-card")].filter((c) => {
        const t = c.querySelector(".process-card-title")?.textContent?.trim().toLowerCase();
        const cap = c.querySelector(".process-card-caption")?.textContent?.trim().toLowerCase();
        return t && cap && t === cap;
      }).length,
    );
    expect(dup).toBe(0);
  });

  test("«Почему именно так» присутствует и не превращается в шесть карточек", async ({ page }) => {
    await open(page, BUSINESSES.cafe, "Кофейня", "why");
    await expect(page.locator(".process-why")).toBeVisible();
    const count = await page.locator(".process-why-list li").count();
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(3);
  });

  test("reduced-motion: страница полностью читаема, карточки видимы", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await open(page, BUSINESSES.salon, "Салон красоты", "rm");
    const visible = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".process-card")].every((c) => parseFloat(getComputedStyle(c).opacity) > 0.99),
    );
    expect(visible).toBe(true);
    // Заголовки на месте (содержимое не зависит от анимации).
    expect(await page.locator(".process-card-title").count()).toBe(BUSINESSES.salon.length);
    await ctx.close();
  });
});
