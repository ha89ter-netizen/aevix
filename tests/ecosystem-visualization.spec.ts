import { test, expect, type Page } from "./support/fixtures";
import { siteSection } from "./support/routes";

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
  await page.goto(siteSection("#проблемы"));
  await page.addStyleTag({ content: FORCE_REVEAL_STYLE });
  await page.locator("#проблемы").scrollIntoViewIfNeeded();
  await expect(page.locator(".ecosystem-stage")).toBeVisible();
}

async function gotoEcosystem3D(page: Page) {
  await page.goto(siteSection("#проблемы"));
  await page.addStyleTag({ content: FORCE_REVEAL_STYLE });
  await page.locator("#проблемы").scrollIntoViewIfNeeded();
  // The a11y button layer mounts as soon as the section is judged in-view (before the
  // dynamically-imported three.js chunk has necessarily finished downloading) — real DOM, real
  // click targets, not dependent on the WebGL canvas having actually painted anything.
  await expect(page.locator(".ecosystem-canvas-wrap .sr-only button")).toHaveCount(5, { timeout: 10_000 });
  /**
   * И отдельно — сама сцена.
   *
   * Кнопок мало: они появляются раньше сцены, и клик по ним в этом промежутке пропадает
   * впустую — панели не будет. Измерено на программном рендеринге (SwiftShader), на котором
   * гоняется CI: кнопки на 5-й секунде, canvas — на 10-й. Отсюда и бралась «мигающая» тройка
   * 3D-тестов: на разогретой машине чанк успевал, под нагрузкой — нет.
   *
   * Ждать здесь именно canvas правильно, а не удобно: все проверки ниже про 3D-сцену, и без неё
   * им нечего проверять. Запас времени больше обычного — three.js тянется отдельным чанком.
   */
  await expect(page.locator(".ecosystem-canvas-wrap canvas")).toBeVisible({ timeout: 30_000 });
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

/**
 * Открывает панель узла, повторяя клик.
 *
 * Та же гонка с гидратацией, ради которой существует clickUntil выше: узел отрисован сервером и
 * кликабелен до того, как React навесит onClick, поэтому клик проходит все проверки
 * доступности элемента и не делает ничего. Узлы были единственным местом, где клик оставался
 * одиночным, — отсюда и то, что в полном прогоне мигал каждый раз ДРУГОЙ тест этой группы:
 * какой успел кликнуть в момент гидратации, тот и упал.
 *
 * Повтор безопасен: обработчик узла — `onSelect(node.id)`, а не переключатель, поэтому второй
 * клик по тому же узлу оставляет панель открытой с тем же содержимым.
 */
async function openNode(page: Page, index: number, title?: string) {
  await clickUntil(
    page,
    () => page.locator(".ecosystem-node").nth(index).click(),
    () =>
      title
        ? expect(page.locator(".ecosystem-detail h3")).toHaveText(title, { timeout: 1000 })
        : expect(page.locator(".ecosystem-detail")).toBeVisible({ timeout: 1000 }),
  );
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

    await openNode(page, 0, "Ручные ответы");
    await expect(page.locator(".ecosystem-detail-eyebrow")).toHaveText("Что мешает");
    await expect(page.locator(".ecosystem-detail-highlight")).toContainText("Главный риск");

    await page.locator(".ecosystem-detail-close").click();
    await expect(page.locator(".ecosystem-detail")).toHaveCount(0);

    await switchToAfter(page);
    await openNode(page, 0, "AI-консультант");
    await expect(page.locator(".ecosystem-detail-eyebrow")).toHaveText("Что меняет AEVIX");
  });

  test("Escape closes the detail panel", async ({ page }) => {
    await gotoEcosystem(page);

    await openNode(page, 2);

    await page.keyboard.press("Escape");
    await expect(page.locator(".ecosystem-detail")).toHaveCount(0, { timeout: 5000 });
  });

  test("clicking the backdrop closes the detail panel", async ({ page }) => {
    await gotoEcosystem(page);

    await openNode(page, 3);
    const detail = page.locator(".ecosystem-detail");

    // The overlay closes only when the click lands on the overlay ITSELF, so the point has to be
    // provably outside the content panel. Deriving it from the overlay's own corner was the bug:
    // on a phone the panel is bottom-anchored and full width, so that corner is sometimes covered
    // and the click hit the panel instead — which is exactly why this passed alone and failed in
    // a full run. Aim at the gap between the overlay's top edge and the content's top edge.
    const overlay = await detail.boundingBox();
    const content = await page.locator(".ecosystem-detail-body").boundingBox();
    const gapTop = overlay!.y;
    const gapBottom = content ? content.y : overlay!.y + overlay!.height;
    await page.mouse.click(overlay!.x + overlay!.width / 2, (gapTop + gapBottom) / 2);
    await expect(detail).toHaveCount(0, { timeout: 5000 });
  });

  test("every node opens its own matching detail without leaking another node's copy", async ({ page }) => {
    await gotoEcosystem(page);

    for (let i = 0; i < BEFORE_TITLES.length; i++) {
      await openNode(page, i, BEFORE_TITLES[i]);
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
  /**
   * Клик повторяется до тех пор, пока не появится ожидаемое, — как у `openNode` для CSS-варианта.
   *
   * Ожидания canvas оказалось мало: сцена уже нарисована, а обработчик узла навешивается позже,
   * и одиночный клик в этот промежуток проходит вхолостую. Измерено: без повтора тест «Escape
   * закрывает панель» падал 5 раз из 5, с одним лишь ожиданием canvas — 3 из 5.
   *
   * Повтор безопасен по той же причине, что и у `openNode`: обработчик выбирает узел, а не
   * переключает его, поэтому второй клик оставляет панель открытой с тем же содержимым.
   */
  async function clickHidden(
    page: Page,
    locator: ReturnType<Page["locator"]>,
    expected: () => Promise<void>,
  ) {
    await clickUntil(page, () => locator.dispatchEvent("click"), expected);
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

    await clickHidden(page, buttons.nth(0), () =>
      expect(page.locator(".ecosystem-3d-panel h3")).toHaveText("Ручные ответы"),
    );
    await expect(page.locator(".ecosystem-3d-panel-highlight")).toContainText("Главный риск");
    await expect(page.locator(".ecosystem-3d-panel-stem")).toBeVisible();

    await page.locator(".ecosystem-3d-panel-close").click();
    await expect(page.locator(".ecosystem-3d-panel")).toHaveCount(0);

    await clickHidden(page, buttons.nth(1), () =>
      expect(page.locator(".ecosystem-3d-panel h3")).toHaveText("Потерянные заявки"),
    );
  });

  test("Escape closes the 3D detail panel", async ({ page }) => {
    await gotoEcosystem3D(page);
    await clickHidden(page, page.locator(".ecosystem-canvas-wrap .sr-only button").nth(2), () =>
      expect(page.locator(".ecosystem-3d-panel")).toBeVisible(),
    );

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
    await clickHidden(page, page.locator(".ecosystem-canvas-wrap .sr-only button").first(), () =>
      expect(page.locator(".ecosystem-3d-panel")).toBeVisible(),
    );
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
