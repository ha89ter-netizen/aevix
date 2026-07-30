import { test, expect, type Page } from "@playwright/test";

/**
 * Quality contract for generated website concepts: knowledge-driven page structure per niche,
 * the products-vs-services distinction, no duplicated content between pages, rich About /
 * Contacts / Reviews / FAQ blocks that are explicitly marked as demo content, and working
 * layout variants. Uses the landing's example concepts (local generator — deterministic, no
 * AI key needed).
 */

test.use({ reducedMotion: "reduce" });

async function openExample(page: Page, name: RegExp) {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Посмотреть пример" });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.getByRole("button", { name }).click();
  await expect(page.locator(".concept-preview-stage")).toBeVisible();
  // Reduced motion applies the whole reveal instantly; give React a beat to settle.
  await page.waitForTimeout(400);
}

function conceptNav(page: Page) {
  return page.locator(".concept-nav nav");
}

function conceptMain(page: Page) {
  return page.locator(".concept-site main");
}

test.describe("knowledge-driven structure", () => {
  test("a barbershop has services, not a menu", async ({ page }) => {
    await openExample(page, /FORMA/);

    const nav = conceptNav(page);
    await expect(nav.getByRole("button", { name: "Услуги" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Меню" })).toHaveCount(0);

    // The niche's real service catalogue with prices lives on the services page.
    await nav.getByRole("button", { name: "Услуги" }).click();
    await expect(conceptMain(page).getByText("Мужская стрижка")).toBeVisible();
    await expect(conceptMain(page).getByText("Моделирование бороды")).toBeVisible();
  });

  test("a coffee shop has BOTH a menu (products) and services, without duplication", async ({ page }) => {
    await openExample(page, /ROAST/);

    const nav = conceptNav(page);
    await expect(nav.getByRole("button", { name: "Меню" })).toBeVisible();

    // Home teases but never carries the full menu.
    await expect(conceptMain(page).getByText("Капучино")).toHaveCount(0);

    // The menu page carries the full product list AND a separate services block.
    await nav.getByRole("button", { name: "Меню" }).click();
    await expect(conceptMain(page).getByText("Капучино")).toBeVisible();
    await expect(conceptMain(page).getByText("Кейтеринг на мероприятия")).toBeVisible();
  });

  test("a hotel sells rooms", async ({ page }) => {
    await openExample(page, /AURA/);

    const nav = conceptNav(page);
    await expect(nav.getByRole("button", { name: "Номера" })).toBeVisible();
    await nav.getByRole("button", { name: "Номера" }).click();
    await expect(conceptMain(page).getByText("Люкс с террасой")).toBeVisible();
  });
});

test.describe("rich generated pages", () => {
  test("the About page has story, values, team and a closing CTA", async ({ page }) => {
    await openExample(page, /ROAST/);
    await conceptNav(page).getByRole("button", { name: "О нас" }).click();

    const main = conceptMain(page);
    await expect(main.locator(".concept-about-story p")).toHaveCount(2);
    await expect(main.locator(".concept-about-mission")).toBeVisible();
    await expect(main.locator(".concept-about-values article")).toHaveCount(3);
    await expect(main.locator(".concept-about-member").first()).toBeVisible();
    await expect(main.locator(".concept-about-cta button")).toBeVisible();
  });

  test("the contacts block shows demo hours, address, phone and is marked as demo", async ({ page }) => {
    await openExample(page, /ROAST/);
    await conceptNav(page).getByRole("button", { name: "Запись и контакты" }).click();

    const main = conceptMain(page);
    await expect(main.locator(".concept-hours-row").first()).toBeVisible();
    await expect(main.getByText("Проспект Абая, 127, Алматы").first()).toBeVisible();
    await expect(main.getByText("+7 (727) 355-01-18")).toBeVisible();
    await expect(main.getByText("hello@roast.kz")).toBeVisible();
    await expect(main.locator(".concept-map")).toBeVisible();
    await expect(main.locator(".concept-contacts .concept-demo-chip")).toHaveText("Демо-данные");
  });

  test("reviews show an overall rating, count and varied cards marked as demo", async ({ page }) => {
    await openExample(page, /ROAST/);

    const reviews = conceptMain(page).locator(".concept-reviews");
    await expect(reviews.locator(".concept-reviews-summary strong")).toHaveText("4.8");
    await expect(reviews.getByText("на основе 37 отзывов")).toBeVisible();
    await expect(reviews.locator(".concept-review-card:visible")).toHaveCount(5);
    await expect(reviews.locator(".concept-demo-chip")).toHaveText("Демонстрационные отзывы");
  });

  test("the FAQ renders niche-specific questions with answers", async ({ page }) => {
    await openExample(page, /FORMA/);
    await conceptNav(page).getByRole("button", { name: "Запись и контакты" }).click();

    const faq = conceptMain(page).locator(".concept-faq");
    await expect(faq.locator(".concept-faq-item")).toHaveCount(4);
    await expect(faq.getByText("Стрижёте ли детей?")).toBeVisible();
  });
});

test.describe("layout variants", () => {
  test("different niches land on different layout templates and the switcher cycles them", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "sidebar switcher is a desktop control");
    await openExample(page, /ROAST/);

    const site = page.locator(".concept-site");
    const first = await site.getAttribute("data-layout");
    expect(["classic", "editorial", "showcase"]).toContain(first);

    // The sidebar's layout tool actually changes the composition attribute.
    const layoutButton = page.locator(".concept-sidebar-item", { hasText: /Классический|Журнальный|Витрина/ });
    await layoutButton.click();
    const second = await site.getAttribute("data-layout");
    expect(second).not.toBe(first);
    await layoutButton.click();
    const third = await site.getAttribute("data-layout");
    expect([first, second]).not.toContain(third);
  });

  test("hero photos differ between pages of one concept", async ({ page }) => {
    await openExample(page, /ROAST/);
    const heroSrc = () => page.locator(".concept-hero-photo").getAttribute("src");

    const homeHero = await heroSrc();
    await conceptNav(page).getByRole("button", { name: "Меню" }).click();
    await page.waitForTimeout(300);
    const menuHero = await heroSrc();
    expect(menuHero).not.toBe(homeHero);
  });
});
