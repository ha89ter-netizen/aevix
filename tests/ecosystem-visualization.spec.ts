import { test, expect, type Page } from "@playwright/test";

/**
 * The "До и после AEVIX" section: a core orb wired to five satellite orbs by web-like spokes.
 * Toggling "После AEVIX" swaps every label and re-themes the network; clicking a satellite
 * orb opens a detail panel with copy matching whichever mode is active.
 *
 * Regression note: the detail panel used to render `position: absolute` inside a section that
 * `flex items-center`-centers content taller than the viewport, so its close button could end
 * up rendered above the visible viewport — reachable by Escape but not by an actual click, and
 * even after fixing that it still sat behind the fixed site header (z-40) until portaled to
 * <body>, matching PremiumModal's own pattern. All three close paths are covered here so a
 * regression in any of them is caught.
 */

async function gotoEcosystem(page: Page) {
  await page.goto("/#проблемы");
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

test.describe("ecosystem visualisation", () => {
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
