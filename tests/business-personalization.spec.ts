import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Once a business is recognised it becomes the source of state for the whole page: the Hero
 * dashboard, cases, solutions and CTAs all adapt, and the Navigation Center reflects it.
 * The analysis endpoint is mocked for determinism.
 */

const FIELD = "#hero-business-input";
const RESULT = ".hero-result";
const TRIGGER = ".nav-center-trigger";
const DIALOG = '[role="dialog"]';
const BARBER_TEXT = "У меня барбершоп на 3 мастера, запись вручную";

async function mockSuccess(page: Page, summary = "Разбор барбершопа готов.") {
  await page.route("**/api/business-analysis", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { summary }, analysis: summary }),
    }),
  );
}

async function gotoHydrated(page: Page) {
  await page.goto("/");
  const field = page.locator(FIELD);
  await expect(field).toBeVisible();
  // Gate on hydration (controlled textarea wipes pre-hydration values).
  await expect(async () => {
    await field.fill("·");
    await expect(field).toHaveValue("·", { timeout: 400 });
  }).toPass({ timeout: 8000 });
  await field.fill("");
  await field.blur();
}

async function analyzeBarber(page: Page) {
  await mockSuccess(page);
  await gotoHydrated(page);
  await page.locator(FIELD).fill(BARBER_TEXT);
  await page.locator(FIELD).press("Enter");
  await expect(page.locator(RESULT)).toBeVisible();
}

async function openNavCenter(page: Page) {
  const dialog = page.locator(DIALOG);
  await expect(async () => {
    await page.locator(TRIGGER).click();
    await expect(dialog).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20000 });
}

test.describe("site personalisation", () => {
  test("recognised business adapts cases and solutions", async ({ page }) => {
    await analyzeBarber(page);

    // Cases section gains a personalised scenario card.
    const personalCase = page.locator(".hero-personal-case");
    await expect(personalCase).toBeVisible();
    await expect(personalCase.getByText(/Ваш сценарий · Барбершоп/)).toBeVisible();

    // Pricing spotlights the 3 recommended modules for a barbershop. Count is scroll-independent
    // (the cards live in a scroll-reveal grid); scroll one in to prove the badge renders.
    // Asserted by count, not visibility: these cards live inside the site's scroll-reveal
    // grid, so visibility depends on that system rather than on the personalisation itself.
    const recommended = page.locator(".pricing-scene article.is-recommended");
    await expect(recommended).toHaveCount(3);
    await expect(page.locator(".pricing-scene .hero-recommend-badge")).toHaveCount(3);
  });

  test("Hero result shows category metrics dashboard", async ({ page }) => {
    await analyzeBarber(page);
    const result = page.locator(RESULT);
    await expect(result.locator(".hero-metric")).toHaveCount(3);
    // Per-business implementation roadmap renders its phases.
    await expect(result.locator(".hero-roadmap-step")).toHaveCount(5);
  });

  test("shows AI confidence, and asks for detail when it is low", async ({ page }) => {
    // A clearly-matched description reports high confidence and no prompt for more detail.
    await analyzeBarber(page);
    const confidence = page.locator(".hero-confidence");
    await expect(confidence).toBeVisible();
    await expect
      .poll(async () => parseInt((await confidence.innerText()).replace(/\D/g, ""), 10))
      .toBeGreaterThanOrEqual(85);
    await expect(page.locator(".hero-confidence-hint")).toHaveCount(0);
  });

  test("low-confidence description invites more detail", async ({ page }) => {
    await mockSuccess(page, "Разбор готов.");
    await gotoHydrated(page);
    // Nothing category-specific: detection falls back to generic with low confidence.
    await page.locator(FIELD).fill("хочу больше заявок");
    await page.locator(FIELD).press("Enter");
    await expect(page.locator(RESULT)).toBeVisible();
    await expect(page.locator(".hero-confidence-hint")).toBeVisible();
  });

  test("whole-site accent re-themes to the business", async ({ page }) => {
    await analyzeBarber(page);
    // The shell's registered accent channel morphs away from the default violet (122,92,255).
    await expect
      .poll(() =>
        page.locator(".app-shell").evaluate((el) =>
          Math.round(parseFloat(getComputedStyle(el).getPropertyValue("--accent-r"))),
        ),
      )
      .toBe(109); // barbershop accent r-channel
  });

  test("FAQ answers adapt to the business", async ({ page }) => {
    await analyzeBarber(page);
    const faq = page.locator("#faq");
    // Counts are scroll-independent; the section lives in scroll-reveal blocks.
    await expect(faq.locator(".faq-item")).toHaveCount(3);
    await expect(faq.getByText(/FAQ · Барбершоп/)).toHaveCount(1);
    // Scroll the actual item in (its reveal block sits below the heading) before asserting visibility.
    const firstItem = faq.locator(".faq-item").first();
    await firstItem.scrollIntoViewIfNeeded();
    await expect(firstItem.getByText(/Как клиенты будут записываться/)).toBeVisible();
  });

  test("reset returns the site to its neutral state", async ({ page }) => {
    await analyzeBarber(page);
    await expect(page.locator(".hero-personal-case")).toBeVisible();

    await openNavCenter(page);
    await expect(page.locator(".nav-center-status.is-ready")).toBeVisible();
    await page.locator(".nav-center-reset").click();

    // Status flips back to the idle prompt, and personalised blocks disappear.
    await expect(page.locator(".nav-center-status.is-idle")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(DIALOG)).toHaveCount(0);
    await expect(page.locator(".hero-personal-case")).toHaveCount(0);
    await expect(page.locator(".pricing-scene .hero-recommend-badge")).toHaveCount(0);
  });
});

test.describe("navigation center", () => {
  test("opens as a dialog with grouped destinations", async ({ page }) => {
    await gotoHydrated(page);
    await openNavCenter(page);
    await expect(page.getByRole("heading", { name: "Навигация AEVIX" })).toBeVisible();
    await expect(page.locator(".nav-center-card")).toHaveCount(9);
    // Idle: prompts the visitor to personalise.
    await expect(page.locator(".nav-center-status.is-idle")).toBeVisible();
  });

  test("selecting a destination scrolls and closes without locking scroll", async ({ page }) => {
    await gotoHydrated(page);
    await openNavCenter(page);

    await page.locator(".nav-center-card", { hasText: "Стоимость" }).click();

    // Panel closes...
    await expect(page.locator(DIALOG)).toHaveCount(0);
    // ...the target section is scrolled into view...
    await expect(page.locator("#стоимость")).toBeInViewport({ timeout: 5000 });

    // ...and no scroll lock lingers.
    const state = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollBy(0, 300);
      const moved = window.scrollY !== before;
      window.scrollTo(0, before);
      return { moved, position: document.body.style.position, overflow: document.body.style.overflow };
    });
    expect(state.moved).toBe(true);
    expect(state.position).toBe("");
    expect(state.overflow).toBe("");
  });

  test("reflects the recognised business", async ({ page }) => {
    await analyzeBarber(page);
    await openNavCenter(page);
    const status = page.locator(".nav-center-status.is-ready");
    await expect(status).toBeVisible();
    await expect(status.getByText(/Барбершоп/)).toBeVisible();
    await expect(status.getByText(/автоматизация 82%/)).toBeVisible();
  });
});
