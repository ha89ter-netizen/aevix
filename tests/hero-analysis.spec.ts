import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Hero business-analysis field.
 *
 * The API is mocked so success / failure / latency are deterministic; the real endpoint is
 * exercised manually. Business detection and the automation list are produced locally, so
 * they are asserted independently of the mocked network response.
 */

const FIELD = "#hero-business-input";
const SUBMIT = ".hero-field-submit";
const RESULT = ".hero-result";
const GHOST = ".hero-placeholder-ghost";
const BARBER_TEXT = "У меня барбершоп на 3 мастера, запись вручную";

async function gotoHero(page: Page) {
  await page.goto("/");
  const field = page.locator(FIELD);
  await expect(field).toBeVisible();

  // Gate on React hydration. The textarea is controlled, so a value written before its
  // onChange is attached gets wiped by hydration reconciliation. Retry a probe round-trip
  // until it sticks, then clear it, guaranteeing an interactive, empty field.
  await expect(async () => {
    await field.fill("·");
    await expect(field).toHaveValue("·", { timeout: 400 });
  }).toPass({ timeout: 8000 });
  await field.fill("");
  await field.blur(); // unfocus so the idle placeholder cycle can run
}

async function mockAnalysis(page: Page, handler: (route: Route) => Promise<void> | void) {
  await page.route("**/api/business-analysis", handler);
}

function successResponse(summary: string) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ result: { summary }, analysis: summary }),
  };
}

test.describe("hero analysis field", () => {
  test("starts empty", async ({ page }) => {
    // Bare load (no hydration probe) so this asserts the genuine initial value.
    await page.goto("/");
    await expect(page.locator(FIELD)).toBeVisible();
    await expect(page.locator(FIELD)).toHaveValue("");
  });

  test("placeholder cross-fades between phrases while idle", async ({ page }) => {
    await gotoHero(page);
    const ghost = page.locator(GHOST);
    await expect(ghost).toBeVisible();
    const first = (await ghost.innerText()).trim();
    // The cross-fade advances on a ~2.8s interval; poll until a different phrase appears.
    await expect
      .poll(async () => (await ghost.innerText()).trim(), { timeout: 9000, intervals: [300] })
      .not.toBe(first);
  });

  test("focusing freezes the placeholder cross-fade", async ({ page }) => {
    await gotoHero(page);
    const field = page.locator(FIELD);
    const ghost = page.locator(GHOST);
    await field.focus();
    const frozen = (await ghost.innerText()).trim();
    await page.waitForTimeout(1600);
    expect((await ghost.innerText()).trim()).toBe(frozen);
  });

  test("typing hides the placeholder and never overwrites the value", async ({ page }) => {
    await gotoHero(page);
    const field = page.locator(FIELD);
    await field.fill(BARBER_TEXT);
    // With a value present, the placeholder ghost is removed entirely.
    await expect(page.locator(GHOST)).toHaveCount(0);
    await page.waitForTimeout(2500);
    await expect(field).toHaveValue(BARBER_TEXT);
  });

  test("empty form does not submit", async ({ page }) => {
    let requests = 0;
    await mockAnalysis(page, (route) => {
      requests += 1;
      return route.fulfill(successResponse("test"));
    });
    await gotoHero(page);

    // The submit button is disabled while empty.
    await expect(page.locator(SUBMIT)).toBeDisabled();

    // Enter on an empty field surfaces the hint and never fires a request.
    await page.locator(FIELD).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".hero-input-hint.is-error")).toBeVisible();
    await expect(page.locator(".hero-loading-mark")).toHaveCount(0);
    expect(requests).toBe(0);
  });

  test("Enter submits, Shift+Enter inserts a newline", async ({ page }) => {
    await mockAnalysis(page, (route) => route.fulfill(successResponse("Разбор готов.")));
    await gotoHero(page);
    const field = page.locator(FIELD);

    // Shift+Enter must not submit; it adds a line break.
    await field.fill("строка один");
    await field.press("Shift+Enter");
    await field.type("строка два");
    await expect(field).toHaveValue("строка один\nстрока два");
    await expect(page.locator(RESULT)).toHaveCount(0);

    // Enter submits.
    await field.press("Enter");
    await expect(page.locator(RESULT)).toBeVisible();
  });

  test("blocks concurrent re-submission while loading", async ({ page }) => {
    let requests = 0;
    await mockAnalysis(page, async (route) => {
      requests += 1;
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill(successResponse("Готово."));
    });
    await gotoHero(page);
    const field = page.locator(FIELD);
    await field.fill(BARBER_TEXT);

    await field.press("Enter");
    // While the request is in flight the control is disabled...
    await expect(page.locator(SUBMIT)).toBeDisabled();
    // ...and extra Enter presses do nothing.
    await field.press("Enter");
    await field.press("Enter");

    await expect(page.locator(RESULT)).toBeVisible();
    expect(requests).toBe(1);
  });

  test("loading, then success with detected business and automations", async ({ page }) => {
    await mockAnalysis(page, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill(successResponse("В барбершопе запись ведётся вручную — это можно автоматизировать."));
    });
    await gotoHero(page);
    const field = page.locator(FIELD);
    await field.fill(BARBER_TEXT);
    await field.press("Enter");

    // Analysing state: the four-beat narrative sequence, ending on the interface rebuild.
    await expect(page.locator(".hero-loading-mark")).toBeVisible();
    await expect(page.locator(".hero-sequence-step")).toHaveCount(4);
    await expect(page.getByText("Перестраиваем интерфейс")).toBeVisible();

    // Success state: recognised business + confidence + 3 metric tiles + 5-phase roadmap.
    const result = page.locator(RESULT);
    await expect(result).toBeVisible();
    await expect(result.getByText("Барбершоп", { exact: true })).toBeVisible();
    await expect(result.locator(".hero-confidence")).toBeVisible();
    await expect(result.locator(".hero-metric")).toHaveCount(3);
    await expect(result.locator(".hero-roadmap-step")).toHaveCount(5);
    await expect(result.getByText("запись ведётся вручную", { exact: false })).toBeVisible();
    await expect(result.getByRole("button", { name: /Продолжить/ })).toBeVisible();

    // Entered text is preserved in state.
    await expect(field).toHaveValue(BARBER_TEXT);
  });

  test("API failure falls back gracefully with a retry affordance", async ({ page }) => {
    await mockAnalysis(page, (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    await gotoHero(page);
    const field = page.locator(FIELD);
    await field.fill("У меня кофейня с доставкой");
    await field.press("Enter");

    // A useful (local) result still renders...
    const result = page.locator(RESULT);
    await expect(result).toBeVisible();
    await expect(result.getByText("Кофейня / ресторан", { exact: true })).toBeVisible();
    // ...with an explicit degraded notice and retry.
    await expect(result.getByText(/AI-сервис временно недоступен/)).toBeVisible();
    await expect(result.getByRole("button", { name: /Повторить с AI/ })).toBeVisible();
  });

  test("has an accessible label and description", async ({ page }) => {
    await gotoHero(page);
    const field = page.locator(FIELD);
    await expect(field).toHaveAttribute("aria-label", /Опишите ваш бизнес/);
    await expect(field).toHaveAttribute("aria-describedby", "hero-input-hint");
    // The visually-hidden <label> is wired to the field id.
    await expect(page.locator('label[for="hero-business-input"]')).toHaveCount(1);
  });

  test("hero submit never leaves the page scroll-locked", async ({ page }) => {
    await mockAnalysis(page, (route) => route.fulfill(successResponse("Готово.")));
    await gotoHero(page);
    await page.locator(FIELD).fill(BARBER_TEXT);
    await page.locator(FIELD).press("Enter");
    await expect(page.locator(RESULT)).toBeVisible();

    const scrollable = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollBy(0, 400);
      const moved = window.scrollY !== before;
      window.scrollTo(0, before);
      return { moved, position: document.body.style.position, overflow: document.body.style.overflow };
    });
    expect(scrollable.moved).toBe(true);
    expect(scrollable.position).toBe("");
    expect(scrollable.overflow).toBe("");
  });
});

test.describe("hero analysis field · mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile-only layout check");

  test("stacks the field and stays usable", async ({ page }) => {
    await mockAnalysis(page, (route) => route.fulfill(successResponse("Готово.")));
    await gotoHero(page);
    const field = page.locator(FIELD);
    const submit = page.locator(SUBMIT);

    // On narrow screens the field and button stack vertically (button sits below the input).
    const fieldBox = await field.boundingBox();
    const submitBox = await submit.boundingBox();
    expect(fieldBox && submitBox).toBeTruthy();
    if (fieldBox && submitBox) {
      expect(submitBox.y).toBeGreaterThan(fieldBox.y);
    }

    await field.fill(BARBER_TEXT);
    await submit.click();
    await expect(page.locator(RESULT)).toBeVisible();
  });
});
