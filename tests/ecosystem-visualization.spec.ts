import { test, expect, type Page } from "@playwright/test";

/**
 * The "До и после AEVIX" section. As of the React Three Fiber rework, EcosystemSceneLoader picks
 * between two implementations behind the same nodes/mode/activeId/onSelect props:
 *
 *  - prefers-reduced-motion (or the section not yet scrolled into view): the original flat-CSS
 *    orb visualisation (EcosystemCssFallback) — a core orb wired to five satellite orbs by
 *    web-like spokes, toggled by "После AEVIX", with a click-to-open detail panel.
 *  - otherwise: a real WebGL scene (EcosystemScene) via react-three-fiber. Canvas content isn't
 *    practically assertable the way DOM is, so its own group below drives the same interactions
 *    through the visually-hidden accessible button layer that's always mounted alongside the
 *    canvas — real DOM, real clicks, and it's exactly what keyboard/screen-reader users rely on
 *    too, so it's a legitimate functional test surface, not a workaround.
 *
 * The first group below forces prefers-reduced-motion so the CSS fallback renders deterministically
 * (it's the exact same component/DOM as before this rework — these tests are unchanged).
 *
 * Regression note: the detail panel used to render `position: absolute` inside a section that
 * `flex items-center`-centers content taller than the viewport, so its close button could end
 * up rendered above the visible viewport — reachable by Escape but not by an actual click, and
 * even after fixing that it still sat behind the fixed site header (z-40) until portaled to
 * <body>, matching PremiumModal's own pattern. All three close paths are covered here so a
 * regression in any of them is caught.
 */

const FORCE_REVEAL_STYLE =
  "[data-reveal]{opacity:1!important;visibility:visible!important;transform:none!important;filter:none!important}";

async function gotoEcosystem(page: Page) {
  // test.use({ reducedMotion: "reduce" }) sets the context option, but it doesn't reliably flip
  // `(prefers-reduced-motion: reduce)` in every Chromium build — emulateMedia before navigation
  // is what actually guarantees usePrefersReducedMotion() sees it on first render.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#проблемы");
  // The section's own column is a [data-reveal] scroll target (GSAP/ScrollTrigger fade-in via
  // usePremiumMotion); scrollIntoViewIfNeeded's instant jump doesn't reliably cross Lenis's
  // synced scroll-trigger threshold, so force it visible up front — same workaround already used
  // in business-personalization.spec.ts for the same class of scroll-reveal-hidden content.
  await page.addStyleTag({ content: FORCE_REVEAL_STYLE });
  await page.locator("#проблемы").scrollIntoViewIfNeeded();
  await expect(page.locator(".ecosystem-stage")).toBeVisible();
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

test.describe("ecosystem visualisation (reduced motion → CSS fallback)", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders five satellite orbs arranged in a circle around the core", async ({ page }) => {
    await gotoEcosystem(page);

    await expect(page.locator(".ecosystem-node")).toHaveCount(5);
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
    // land on the same spot (the historical bug here was every node collapsing onto one axis).
    const radii = positions.map(({ x, y }) => Math.round(Math.sqrt(x * x + y * y)));
    for (const r of radii) expect(Math.abs(r - radii[0])).toBeLessThan(2);
    const uniqueX = new Set(positions.map((p) => p.x));
    expect(uniqueX.size).toBeGreaterThan(1);
  });

  test("После AEVIX re-labels the core and every satellite orb", async ({ page }) => {
    await gotoEcosystem(page);

    await expect(page.locator(".ecosystem-node-label").first()).toHaveText("Ручные ответы");

    await switchToAfter(page);

    await expect(page.locator(".ecosystem-node-label").first()).toHaveText("AI-консультант");
  });

  test("clicking a node opens a detail panel matching the current before/after mode", async ({ page }) => {
    await gotoEcosystem(page);

    await page.locator(".ecosystem-node").first().click();
    await expect(page.locator(".ecosystem-detail h3")).toHaveText("Ручные ответы");
    await expect(page.locator(".ecosystem-detail-eyebrow")).toHaveText("Что мешает");

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

    const expectedBefore = [
      "Ручные ответы",
      "Excel и таблицы",
      "Записи в блокноте",
      "Пропущенные сообщения",
      "Звонки без контекста",
    ];

    for (let i = 0; i < expectedBefore.length; i++) {
      await page.locator(".ecosystem-node").nth(i).click();
      await expect(page.locator(".ecosystem-detail h3")).toHaveText(expectedBefore[i]);
      await page.locator(".ecosystem-detail-close").click();
      await expect(page.locator(".ecosystem-detail")).toHaveCount(0, { timeout: 5000 });
    }
  });
});

test.describe("ecosystem visualisation (3D scene, motion allowed)", () => {
  async function gotoEcosystem3D(page: Page) {
    await page.goto("/#проблемы");
    // Same scroll-reveal workaround as gotoEcosystem — see its comment.
    await page.addStyleTag({ content: FORCE_REVEAL_STYLE });
    await page.locator("#проблемы").scrollIntoViewIfNeeded();
    // The a11y button layer mounts as soon as the section is judged in-view (before the
    // dynamically-imported three.js chunk has necessarily finished downloading) — real DOM,
    // real click targets, not dependent on the WebGL canvas having actually painted anything.
    await expect(page.locator(".ecosystem-canvas-wrap .sr-only button")).toHaveCount(5, { timeout: 10_000 });
  }

  // The a11y buttons are deliberately visually hidden (Tailwind's sr-only: clipped to a 1x1 box)
  // sitting behind the full-size canvas in paint order. A real click — even with force:true,
  // which only skips Playwright's actionability checks, not real hit-testing — lands on whatever
  // covers that screen coordinate (the canvas), not the clipped button underneath. Keyboard/
  // screen-reader activation doesn't go through pointer coordinates at all, so dispatching the
  // click event directly on the element is what actually matches real usage here.
  async function clickHidden(page: Page, locator: ReturnType<Page["locator"]>) {
    await locator.dispatchEvent("click");
  }

  test("mounts a real WebGL canvas, not the CSS fallback", async ({ page }) => {
    await gotoEcosystem3D(page);
    await expect(page.locator(".ecosystem-canvas-wrap canvas")).toBeVisible({ timeout: 10_000 });
    // The CSS fallback's own visible orbs must not also be present once the 3D scene has mounted.
    await expect(page.locator(".ecosystem-canvas-wrap .ecosystem-stage")).toHaveCount(0);
  });

  test("hidden accessible buttons open and close each node's detail panel", async ({ page }) => {
    await gotoEcosystem3D(page);
    const buttons = page.locator(".ecosystem-canvas-wrap .sr-only button");

    await clickHidden(page, buttons.nth(0));
    await expect(page.locator(".ecosystem-3d-panel h3")).toHaveText("Ручные ответы");

    await page.locator(".ecosystem-3d-panel-close").click();
    await expect(page.locator(".ecosystem-3d-panel")).toHaveCount(0);

    await clickHidden(page, buttons.nth(1));
    await expect(page.locator(".ecosystem-3d-panel h3")).toHaveText("Excel и таблицы");
  });

  test("Escape closes the 3D detail panel", async ({ page }) => {
    await gotoEcosystem3D(page);
    await clickHidden(page, page.locator(".ecosystem-canvas-wrap .sr-only button").nth(2));
    await expect(page.locator(".ecosystem-3d-panel")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".ecosystem-3d-panel")).toHaveCount(0, { timeout: 5000 });
  });

  test("the before/after switch re-labels the hidden buttons too", async ({ page }) => {
    await gotoEcosystem3D(page);
    const buttons = page.locator(".ecosystem-canvas-wrap .sr-only button");
    await expect(buttons.first()).toHaveText("Подробнее: Ручные ответы");

    await page.getByRole("button", { name: "После AEVIX" }).click();
    await expect(buttons.first()).toHaveText("Подробнее: AI-консультант");
  });

  test("no console errors while mounting, toggling, and interacting with the scene", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await gotoEcosystem3D(page);
    await expect(page.locator(".ecosystem-canvas-wrap canvas")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "После AEVIX" }).click();
    await page.waitForTimeout(2200); // let the ignition transition run to completion
    await clickHidden(page, page.locator(".ecosystem-canvas-wrap .sr-only button").first());
    await page.keyboard.press("Escape");

    expect(errors).toEqual([]);
  });
});
