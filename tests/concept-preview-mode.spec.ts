import { test, expect, type Page } from "@playwright/test";

/**
 * Regression cover for the concept workspace scroll defect.
 *
 * Root cause: the site preview lives in a nested scroll container inside a modal that
 * locks the page (`body { position: fixed; overflow: hidden }`). In edit mode the editor
 * chrome consumed ~51% of the panel, leaving a ~311px porthole onto ~1868px of content,
 * and `overscroll-behavior: contain` stopped any scroll chaining. With the pointer over
 * the chrome, a wheel/trackpad gesture moved nothing at all - reported as "scroll is
 * broken on Mac". Preview mode removes the chrome and gives the stage the full panel.
 */

const CHROME_SELECTORS = [
  ".concept-workspace-toolbar",
  ".concept-disclaimer",
  ".concept-reveal-rail",
  ".concept-page-status",
  ".concept-workspace-footer",
] as const;

const STAGE = ".concept-preview-stage";

/**
 * Clicks a control and waits for its effect, retrying the click if nothing happened.
 *
 * The server-rendered markup is clickable before React attaches its handlers, so a click
 * that lands during hydration passes every actionability check yet does nothing. Retrying
 * until the expected result appears is the reliable way to drive a freshly loaded page.
 */
async function clickUntil(page: Page, click: () => Promise<void>, expected: () => Promise<void>) {
  await expect(async () => {
    await click();
    await expected();
  }).toPass({ timeout: 20_000 });
}

async function openConceptExample(page: Page) {
  await page.goto("/#ai-анализ");

  const dialog = page.getByRole("dialog");
  await clickUntil(
    page,
    () => page.getByRole("button", { name: "Посмотреть пример" }).click(),
    () => expect(dialog).toBeVisible({ timeout: 1500 }),
  );

  await clickUntil(
    page,
    () => dialog.getByRole("button", { name: /FORMA/ }).click(),
    () => expect(page.locator(STAGE)).toBeVisible({ timeout: 1500 }),
  );
}

async function enterPreview(page: Page) {
  await clickUntil(
    page,
    () => page.getByRole("button", { name: "Просмотр" }).click(),
    () => expect(page.locator(".concept-preview-exit")).toBeAttached({ timeout: 1500 }),
  );
}

test.describe("concept preview mode", () => {
  test("preview hides every editor panel", async ({ page }) => {
    await openConceptExample(page);
    await enterPreview(page);

    for (const selector of CHROME_SELECTORS) {
      await expect(page.locator(selector)).toBeHidden();
    }
    // The modal's own close control is replaced by the minimal in-preview affordance.
    await expect(page.getByRole("button", { name: "Закрыть окно" })).toHaveCount(0);
  });

  test("preview gives the stage the full panel height and it scrolls", async ({ page }) => {
    await openConceptExample(page);
    await enterPreview(page);

    const metrics = await page.locator(STAGE).evaluate((stage) => {
      const panel = stage.closest('[role="dialog"]') as HTMLElement;
      return {
        stageH: stage.clientHeight,
        panelH: panel.getBoundingClientRect().height,
        contentH: stage.scrollHeight,
      };
    });

    // The stage must own essentially the whole panel - this is the actual bug fix.
    expect(metrics.stageH / metrics.panelH).toBeGreaterThan(0.95);
    // And there must be real content to scroll through.
    expect(metrics.contentH).toBeGreaterThan(metrics.stageH);
  });

  test("keyboard drives the preview scroll (PageDown / End / Home)", async ({ page }, testInfo) => {
    // Physical page keys are a desktop concern; touch devices have no equivalent.
    test.skip(testInfo.project.name !== "desktop", "desktop-only scenario");
    await openConceptExample(page);
    await enterPreview(page);

    const stage = page.locator(STAGE);
    const scrollTop = () => stage.evaluate((el) => Math.round(el.scrollTop));

    expect(await scrollTop()).toBe(0);

    // The stage uses `scroll-behavior: smooth`, so each assertion polls until the
    // keyboard-driven scroll animation settles rather than reading mid-flight.
    await page.keyboard.press("PageDown");
    await expect.poll(scrollTop).toBeGreaterThan(0);

    await page.keyboard.press("End");
    await expect
      .poll(() =>
        stage.evaluate((el) => Math.abs(el.scrollTop - (el.scrollHeight - el.clientHeight)) < 2),
      )
      .toBe(true);

    await page.keyboard.press("Home");
    await expect.poll(scrollTop).toBe(0);
  });

  test("Escape returns to the editor without losing project state", async ({ page }) => {
    await openConceptExample(page);
    await enterPreview(page);

    await page.keyboard.press("Escape");

    // Back in edit mode, modal still open, concept intact.
    await expect(page.locator(".concept-workspace-toolbar")).toBeVisible();
    await expect(page.locator(".concept-preview-exit")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#website-concept-title")).toHaveText("FORMA");
  });

  test("closing the workspace never leaves a scroll lock behind", async ({ page }) => {
    await openConceptExample(page);
    await enterPreview(page);

    await page.keyboard.press("Escape"); // preview -> editor
    await page.keyboard.press("Escape"); // editor -> closed
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const state = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollBy(0, 300);
      const moved = window.scrollY !== before;
      window.scrollTo(0, before);
      return {
        moved,
        inlinePosition: document.body.style.position,
        inlineOverflow: document.body.style.overflow,
        inlineTop: document.body.style.top,
      };
    });

    expect(state.moved).toBe(true);
    expect(state.inlinePosition).toBe("");
    expect(state.inlineOverflow).toBe("");
    expect(state.inlineTop).toBe("");
  });

  test("no editor panel overlaps the end of the previewed page", async ({ page }) => {
    await openConceptExample(page);
    await enterPreview(page);

    await page.keyboard.press("End");

    // Every chrome panel must be out of the layout entirely, so nothing can cover the
    // final section of the previewed site.
    const overlap = await page.evaluate((selectors) => {
      const stage = document.querySelector(".concept-preview-stage") as HTMLElement;
      const stageBox = stage.getBoundingClientRect();
      return selectors
        .map((selector) => {
          const el = document.querySelector(selector) as HTMLElement | null;
          if (!el) return null;
          const box = el.getBoundingClientRect();
          const intersects =
            box.height > 0 && box.bottom > stageBox.top && box.top < stageBox.bottom;
          return intersects ? selector : null;
        })
        .filter(Boolean);
    }, [...CHROME_SELECTORS]);

    expect(overlap).toEqual([]);
  });
});
