import { test, expect, type Page } from "@playwright/test";

/**
 * The "До и после AEVIX" section — AEVIX Process Orbit. EcosystemSceneLoader picks between two
 * implementations behind the same processes/mode/activeId/onSelect props:
 *
 *  - prefers-reduced-motion (or the section not yet scrolled into view): the flat-CSS orb
 *    visualisation (EcosystemCssFallback) — persistent node labels, before/after toggle, a
 *    click-to-open detail panel.
 *  - otherwise: a real WebGL scene (EcosystemScene) with fixed node positions, a camera that
 *    moves to focus a selected node (nothing ever flies at the viewer), persistent billboard
 *    labels, arrows, a circular dial, and keyboard/swipe/trackpad navigation. Canvas content
 *    isn't practically assertable the way DOM is, so this group drives interactions through the
 *    visually-hidden accessible button layer that's always mounted alongside the canvas — real
 *    DOM, real clicks, and it's exactly what keyboard/screen-reader users rely on too.
 *
 * The first group below forces prefers-reduced-motion so the CSS fallback renders
 * deterministically.
 */

const FORCE_REVEAL_STYLE =
  "[data-reveal]{opacity:1!important;visibility:visible!important;transform:none!important;filter:none!important}";

// The section's heading/visual columns are [data-reveal] scroll targets (GSAP/ScrollTrigger
// fade-in via usePremiumMotion). scrollIntoViewIfNeeded's instant jump doesn't reliably cross
// Lenis's synced scroll-trigger threshold, so force it visible up front — same workaround used in
// business-personalization.spec.ts for the same class of scroll-reveal-hidden content.
async function gotoEcosystem(page: Page) {
  // test.use({ reducedMotion: "reduce" }) sets the context option, but it doesn't reliably flip
  // (prefers-reduced-motion: reduce) in every Chromium build — emulateMedia before navigation is
  // what actually guarantees usePrefersReducedMotion() sees it on first render.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#проблемы");
  await page.addStyleTag({ content: FORCE_REVEAL_STYLE });
  await page.locator("#проблемы").scrollIntoViewIfNeeded();
  await expect(page.locator(".ecosystem-stage")).toBeVisible();
}

async function gotoEcosystem3D(page: Page) {
  await page.goto("/#проблемы");
  await page.addStyleTag({ content: FORCE_REVEAL_STYLE });
  await page.locator("#проблемы").scrollIntoViewIfNeeded();
  // The a11y button layer mounts as soon as the section is judged in-view (before the
  // dynamically-imported three.js chunk has necessarily finished downloading) — real DOM, real
  // click targets, not dependent on the WebGL canvas having actually painted anything.
  await expect(page.locator(".ecosystem-canvas-wrap .sr-only button")).toHaveCount(5, { timeout: 10_000 });
}

/**
 * Clicks a control and waits for its effect, retrying the click if nothing happened.
 *
 * The server-rendered markup is clickable before React attaches its handlers, so a click that
 * lands during hydration passes every actionability check yet does nothing (same pattern as
 * concept-preview-mode.spec.ts's clickUntil).
 */
async function clickUntil(page: Page, click: () => Promise<void>, expected: () => Promise<void>) {
  await expect(async () => {
    await click();
    await expected();
  }).toPass({ timeout: 10_000 });
}

async function switchToAfter(page: Page) {
  await clickUntil(
    page,
    () => page.getByRole("button", { name: "После AEVIX" }).click(),
    () => expect(page.locator(".ecosystem-core span")).toHaveText("После AEVIX", { timeout: 1000 }),
  );
}

const BEFORE_TITLES = [
  "Ручные ответы",
  "Потерянные заявки",
  "Разрозненные таблицы",
  "Пропущенные звонки",
  "Отсутствие контроля",
];

const AFTER_TITLES = [
  "AI-консультант",
  "Единая очередь обращений",
  "Единая CRM",
  "Автоматические сценарии",
  "Понятная аналитика",
];

test.describe("ecosystem visualisation (reduced motion → CSS fallback)", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("renders five persistent, labelled nodes arranged in a circle around the core", async ({ page }) => {
    await gotoEcosystem(page);

    await expect(page.locator(".ecosystem-node")).toHaveCount(5);
    await expect(page.locator(".ecosystem-node-label")).toHaveText(BEFORE_TITLES);
    await expect(page.locator(".ecosystem-core span")).toHaveText("Сейчас");

    const positions = await page.evaluate(() => {
      const stage = document.querySelector(".ecosystem-stage") as HTMLElement;
      const stageBox = stage.getBoundingClientRect();
      return [...document.querySelectorAll(".ecosystem-node")].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.left + r.width / 2 - stageBox.left - stageBox.width / 2),
          y: Math.round(r.top + r.height / 2 - stageBox.top - stageBox.height / 2),
        };
      });
    });

    // A regular pentagon: every node is the same distance from the stage centre, and no two
    // land on the same spot.
    const radii = positions.map(({ x, y }) => Math.round(Math.sqrt(x * x + y * y)));
    for (const r of radii) expect(Math.abs(r - radii[0])).toBeLessThan(2);
    const uniqueX = new Set(positions.map((p) => p.x));
    expect(uniqueX.size).toBeGreaterThan(1);
  });

  test("После AEVIX re-labels the core and every node to its mapped after-state", async ({ page }) => {
    await gotoEcosystem(page);

    await expect(page.locator(".ecosystem-node-label")).toHaveText(BEFORE_TITLES);

    await switchToAfter(page);

    await expect(page.locator(".ecosystem-node-label")).toHaveText(AFTER_TITLES);
  });

  test("clicking a node opens a detail panel with description and highlight, matching the mode", async ({ page }) => {
    await gotoEcosystem(page);

    await page.locator(".ecosystem-node").first().click();
    await expect(page.locator(".ecosystem-detail h3")).toHaveText("Ручные ответы");
    await expect(page.locator(".ecosystem-detail-eyebrow")).toHaveText("Что мешает");
    await expect(page.locator(".ecosystem-detail-highlight")).toContainText("Главный риск");

    await page.locator(".ecosystem-detail-close").click();
    await expect(page.locator(".ecosystem-detail")).toHaveCount(0);

    await switchToAfter(page);
    await page.locator(".ecosystem-node").first().click();
    await expect(page.locator(".ecosystem-detail h3")).toHaveText("AI-консультант");
    await expect(page.locator(".ecosystem-detail-eyebrow")).toHaveText("Что меняет AEVIX");
  });

  test("Escape closes the detail panel", async ({ page }) => {
    await gotoEcosystem(page);

    await page.locator(".ecosystem-node").nth(2).click();
    await expect(page.locator(".ecosystem-detail")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".ecosystem-detail")).toHaveCount(0, { timeout: 5000 });
  });

  test("clicking the backdrop closes the detail panel", async ({ page }) => {
    await gotoEcosystem(page);

    await page.locator(".ecosystem-node").nth(3).click();
    const detail = page.locator(".ecosystem-detail");
    await expect(detail).toBeVisible();

    const box = await detail.boundingBox();
    // Click a corner of the backdrop, away from the orb/copy panel in the centre.
    await page.mouse.click((box?.x ?? 0) + 10, (box?.y ?? 0) + 10);
    await expect(detail).toHaveCount(0, { timeout: 5000 });
  });

  test("every node opens its own matching detail without leaking another node's copy", async ({ page }) => {
    await gotoEcosystem(page);

    for (let i = 0; i < BEFORE_TITLES.length; i++) {
      await page.locator(".ecosystem-node").nth(i).click();
      await expect(page.locator(".ecosystem-detail h3")).toHaveText(BEFORE_TITLES[i]);
      await page.locator(".ecosystem-detail-close").click();
      await expect(page.locator(".ecosystem-detail")).toHaveCount(0, { timeout: 5000 });
    }
  });
});

test.describe("ecosystem visualisation (3D scene, motion allowed)", () => {
  // The a11y buttons are deliberately visually hidden (Tailwind's sr-only: clipped to a 1x1 box)
  // sitting behind the full-size canvas in paint order. A real click — even with force:true,
  // which only skips Playwright's actionability checks, not real hit-testing — lands on whatever
  // covers that screen coordinate (the canvas), not the clipped button underneath. Keyboard/
  // screen-reader activation doesn't go through pointer coordinates at all, so dispatching the
  // click event directly on the element is what actually matches real usage here.
  async function clickHidden(locator: ReturnType<Page["locator"]>) {
    await locator.dispatchEvent("click");
  }

  test("mounts a real WebGL canvas with persistent, always-visible node labels — not the CSS fallback", async ({ page }) => {
    await gotoEcosystem3D(page);
    await expect(page.locator(".ecosystem-canvas-wrap canvas")).toBeVisible({ timeout: 10_000 });
    // The CSS fallback's own visible orbs must not also be present once the 3D scene has mounted.
    await expect(page.locator(".ecosystem-canvas-wrap .ecosystem-stage")).toHaveCount(0);

    // Persistent labels are visible with no node focused — unlike the old design, they never
    // depend on a click to appear.
    await expect(page.locator(".ecosystem-node-label-title")).toHaveText(BEFORE_TITLES);
  });

  test("hidden accessible buttons open a connected detail panel and close it again", async ({ page }) => {
    await gotoEcosystem3D(page);
    const buttons = page.locator(".ecosystem-canvas-wrap .sr-only button");

    await clickHidden(buttons.nth(0));
    await expect(page.locator(".ecosystem-3d-panel h3")).toHaveText("Ручные ответы");
    await expect(page.locator(".ecosystem-3d-panel-highlight")).toContainText("Главный риск");
    await expect(page.locator(".ecosystem-3d-panel-stem")).toBeVisible();

    await page.locator(".ecosystem-3d-panel-close").click();
    await expect(page.locator(".ecosystem-3d-panel")).toHaveCount(0);

    await clickHidden(buttons.nth(1));
    await expect(page.locator(".ecosystem-3d-panel h3")).toHaveText("Потерянные заявки");
  });

  test("Escape closes the 3D detail panel", async ({ page }) => {
    await gotoEcosystem3D(page);
    await clickHidden(page.locator(".ecosystem-canvas-wrap .sr-only button").nth(2));
    await expect(page.locator(".ecosystem-3d-panel")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".ecosystem-3d-panel")).toHaveCount(0, { timeout: 5000 });
  });

  test("prev/next arrows navigate between nodes and update the dial readout", async ({ page }) => {
    await gotoEcosystem3D(page);
    await expect(page.locator(".ecosystem-dial-index")).toHaveText("01 / 05");

    await page.locator(".ecosystem-arrow").nth(1).click(); // next
    await expect(page.locator(".ecosystem-canvas-wrap .sr-only button").nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".ecosystem-dial-index")).toHaveText("01 / 05");
    await expect(page.locator(".ecosystem-3d-panel h3")).toHaveText("Ручные ответы");

    await page.locator(".ecosystem-arrow").nth(1).click(); // next again
    await expect(page.locator(".ecosystem-canvas-wrap .sr-only button").nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".ecosystem-dial-index")).toHaveText("02 / 05");

    await page.locator(".ecosystem-arrow").nth(0).click(); // prev
    await expect(page.locator(".ecosystem-canvas-wrap .sr-only button").nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".ecosystem-dial-index")).toHaveText("01 / 05");
  });

  test("keyboard arrows navigate between nodes", async ({ page }) => {
    await gotoEcosystem3D(page);
    await page.locator(".ecosystem-visual-col").focus();

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".ecosystem-canvas-wrap .sr-only button").nth(0)).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".ecosystem-canvas-wrap .sr-only button").nth(1)).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".ecosystem-canvas-wrap .sr-only button").nth(0)).toHaveAttribute("aria-pressed", "true");
  });

  test("the before/after switch re-labels the hidden buttons and persistent labels together", async ({ page }) => {
    await gotoEcosystem3D(page);
    const buttons = page.locator(".ecosystem-canvas-wrap .sr-only button");
    await expect(buttons.first()).toHaveText("Подробнее: Ручные ответы");
    await expect(page.locator(".ecosystem-node-label-title")).toHaveText(BEFORE_TITLES);

    await page.getByRole("button", { name: "После AEVIX" }).click();

    await expect(buttons.first()).toHaveText("Подробнее: AI-консультант");
    await expect(page.locator(".ecosystem-node-label-title")).toHaveText(AFTER_TITLES);
  });

  test("no console errors while mounting, navigating, toggling, and focusing the scene", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await gotoEcosystem3D(page);
    await expect(page.locator(".ecosystem-canvas-wrap canvas")).toBeVisible({ timeout: 10_000 });

    await page.locator(".ecosystem-arrow").nth(1).click();
    await page.getByRole("button", { name: "После AEVIX" }).click();
    await page.waitForTimeout(2600); // let the ignition transition run to completion (1.8-2.5s)
    await clickHidden(page.locator(".ecosystem-canvas-wrap .sr-only button").first());
    await page.keyboard.press("Escape");

    expect(errors).toEqual([]);
  });

  test("rapid before/after toggling does not break the scene or leak GSAP tweens", async ({ page }) => {
    await gotoEcosystem3D(page);
    const before = page.getByRole("button", { name: "До AEVIX" });
    const after = page.getByRole("button", { name: "После AEVIX" });

    for (let i = 0; i < 4; i++) {
      await after.click();
      await before.click();
    }
    await after.click();
    await page.waitForTimeout(2600);

    await expect(page.locator(".ecosystem-node-label-title")).toHaveText(AFTER_TITLES);
    await expect(page.locator(".ecosystem-canvas-wrap canvas")).toBeVisible();
  });
});

test.describe("ecosystem visualisation (mobile composition)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile has no horizontal scroll and the scene remains navigable", async ({ page }) => {
    await gotoEcosystem3D(page);

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);

    await expect(page.locator(".ecosystem-arrow")).toHaveCount(2);
    await page.locator(".ecosystem-arrow").nth(1).click();
    await expect(page.locator(".ecosystem-canvas-wrap .sr-only button").nth(0)).toHaveAttribute("aria-pressed", "true");
  });
});
