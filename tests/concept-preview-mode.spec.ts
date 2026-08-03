import { test, expect, type Page } from "./support/fixtures";

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
  ".concept-topbar",
  ".concept-disclaimer",
  ".concept-pipeline-status",
  ".concept-sidebar",
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

/**
 * Waits until the stage's scrollable height stops changing. A generated concept keeps settling
 * for a beat after it appears (photos decoding, the reveal's final pieces committing), and any
 * scroll assertion made against a still-moving `scrollHeight` is chasing a target — the "am I
 * at the bottom?" check would read as false purely because the bottom moved. Measuring from a
 * settled layout removes that race at its source instead of hiding it behind a longer timeout.
 */
async function waitForStableScrollHeight(page: Page) {
  const stage = page.locator(STAGE);
  await expect
    .poll(
      async () => {
        const first = await stage.evaluate((el) => el.scrollHeight);
        await page.waitForTimeout(250);
        const second = await stage.evaluate((el) => el.scrollHeight);
        return first === second;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
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

  test("mouse wheel scrolls the preview — Lenis must not hijack it", async ({ page }, testInfo) => {
    // The wheel is a desktop/trackpad concern (touch scrolls natively on mobile). This is the
    // regression guard for the Lenis smooth-scroll hijack that broke wheel scrolling.
    test.skip(testInfo.project.name !== "desktop", "desktop-only wheel scenario");
    await openConceptExample(page);
    await enterPreview(page);

    const stage = page.locator(STAGE);
    const box = await stage.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => stage.evaluate((el) => Math.round(el.scrollTop)), { timeout: 5000 })
      .toBeGreaterThan(0);
  });

  /**
   * Runs with reduced motion, which is what makes this test deterministic rather than merely
   * patient.
   *
   * In preview the stage sets `scroll-behavior: smooth`, so every assertion here used to poll a
   * moving target: the scroll position was mid-animation, and the "am I at the bottom?" check
   * could also be chasing a `scrollHeight` that was still settling. Under full-suite load that
   * animation regularly outlasted the poll budget, which is why this was the one test that kept
   * flapping — passing alone, failing in a crowd.
   *
   * The behaviour under test is "the page keys drive the stage's own scroll container", not how
   * long the animation takes. Reduced motion turns the same scroll into an instant jump (see the
   * global `scroll-behavior: auto !important` rule), so the assertions read a settled value every
   * time. Nothing about what is verified changes; only the timing dependency is removed.
   */
  test.describe("with instant scrolling", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    test("keyboard drives the preview scroll (PageDown / End / Home)", async ({ page }, testInfo) => {
      // Physical page keys are a desktop concern; touch devices have no equivalent.
      test.skip(testInfo.project.name !== "desktop", "desktop-only scenario");
      await openConceptExample(page);
      await enterPreview(page);

      const stage = page.locator(STAGE);
      const scrollTop = () => stage.evaluate((el) => Math.round(el.scrollTop));

      await waitForStableScrollHeight(page);

      // Preview focuses the stage in an effect; wait for that before sending keys, otherwise
      // they land on the body and the stage never scrolls.
      await expect
        .poll(() =>
          page.evaluate(() => document.activeElement?.classList.contains("concept-preview-stage")),
        )
        .toBe(true);

      expect(await scrollTop()).toBe(0);

      // Every keypress here is retried until it takes effect. Each keydown re-renders the
      // preview chrome (it wakes the idle-fading exit pill), and a press that lands between
      // renders is simply dropped — the real reason this test flapped, which reduced motion
      // alone did not address. Only `Home` was retried before, so `End` was the one left racy.
      const pressUntil = (key: string, settled: () => Promise<boolean>) =>
        expect(async () => {
          await page.keyboard.press(key);
          await expect.poll(settled, { timeout: 2000 }).toBe(true);
        }).toPass({ timeout: 15000 });

      await pressUntil("PageDown", async () => (await scrollTop()) > 0);

      await pressUntil("End", () =>
        stage.evaluate((el) => Math.abs(el.scrollTop - (el.scrollHeight - el.clientHeight)) < 2),
      );

      await pressUntil("Home", async () => (await scrollTop()) === 0);
    });
  });

  test("Escape returns to the editor without losing project state", async ({ page }) => {
    await openConceptExample(page);
    await enterPreview(page);

    await page.keyboard.press("Escape");

    // Back in edit mode, modal still open, concept intact.
    await expect(page.locator(".concept-topbar")).toBeVisible();
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

  test("exit control stays clickable after the idle auto-hide fires", async ({ page }) => {
    // Regression guard: the floating "Вернуться к редактированию" / fullscreen pill fades
    // out after PREVIEW_CHROME_IDLE_MS of inactivity. It used to also flip to
    // `pointer-events: none` while idle, which traps the visitor — a click is itself the
    // "wake up" signal, and the browser hit-tests that very click before React can re-render
    // to remove the idle class, so the click fell through to the page underneath and the
    // control never recovered. Worst on mobile, where a tap has no preceding hover to wake
    // it early. There must be no way to get stuck in fullscreen preview with no way out.
    await openConceptExample(page);
    await enterPreview(page);

    // Let the idle auto-hide fire without any further pointer/keyboard activity.
    await page.waitForTimeout(3200);
    await expect(page.locator(".concept-preview-exit")).toHaveClass(/is-idle/);

    const exitButton = page.getByRole("button", { name: "Вернуться к редактированию" });
    await exitButton.click({ timeout: 5000 });

    await expect(page.locator(".concept-topbar")).toBeVisible();
    await expect(page.locator(".concept-preview-exit")).toHaveCount(0);
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
