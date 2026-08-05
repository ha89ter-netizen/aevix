import { test, expect, type Page } from "./support/fixtures";

/**
 * The navigation architecture: one shell for the whole product, with a sidebar whose contents
 * are derived from the route. The three sets (landing / workspace / project) must be mutually
 * exclusive, the logo must always lead back to the Hero, and everything must stay inside one
 * tab and one client-side session.
 */

const SIDEBAR = ".shell-sidebar";
const NAV_ITEM = ".shell-sidebar .shell-nav-item";

/** Pinned open on desktop, behind the hamburger below 1024px. */
async function openNav(page: Page) {
  const menu = page.locator(".shell-menu-button");
  if (await menu.isVisible()) {
    await expect(async () => {
      await menu.click();
      await expect(page.locator(SIDEBAR)).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 20_000 });
  }
  await expect(page.locator(SIDEBAR)).toBeVisible();
}

async function createProject(page: Page, name: string) {
  await page.goto("/app/new");
  const field = page.getByPlaceholder("Например: Барбершоп FORMA");
  const submit = page.getByRole("button", { name: "Создать проект" });
  await expect(async () => {
    await field.fill(name);
    await expect(submit).toBeEnabled({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await submit.click();
  await page.waitForURL(/\/app\/projects\/[^/]+$/);
  // The project generates on arrival; every caller here navigates afterwards and would
  // otherwise be clicking through a screen that is about to be replaced.
  // 20s, not more: the per-test timeout is 45s, so anything above it is a budget that can
  // never be spent. Generation is local under the stubbed AI and settles in well under a second.
  await expect(page.locator(".overview-card-grid")).toBeVisible({ timeout: 20_000 });
}

test.describe("one header, one job per zone", () => {
  test("the right side carries one call to action, plus a quieter way in", async ({ page }) => {
    await page.goto("/");
    // Целевое действие по-прежнему ровно одно: консультация приносит клиентов, вход нужен уже
    // пришедшим. Вход добавлен рядом по решению владельца продукта, но подчинён ей —
    // контурная ссылка против сплошной кнопки. Два одинаково громких элемента здесь однажды
    // уже сделали зону нечитаемой, и именно это правило тест и стережёт.
    await expect(page.locator(".shell-header-right button")).toHaveCount(1);
    await expect(page.locator(".shell-header-right")).toContainText("Бесплатная консультация");
    await expect(page.getByRole("link", { name: "Войти в аккаунт" })).toBeVisible();
    // Ничего третьего.
    await expect(page.locator(".shell-header-right > *")).toHaveCount(2);
    // The old floating pill header and its modal navigation centre are gone for good.
    await expect(page.locator(".site-nav, .nav-center-trigger")).toHaveCount(0);
  });

  test("the centre always names where you are", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".shell-title")).toHaveText("Главная");

    await page.goto("/app/projects");
    await expect(page.locator(".shell-title")).toHaveText("Workspace");

    await page.goto("/app/new");
    await expect(page.locator(".shell-title")).toHaveText("Создать проект");
  });
});

test.describe("sidebar modes are mutually exclusive", () => {
  test("the landing shows only landing sections", async ({ page }) => {
    await page.goto("/");
    await openNav(page);
    await expect(page.locator(NAV_ITEM)).toHaveText([
      "Главная",
      "Возможности",
      "Как работает",
      "Кейсы",
      "Цены",
      "FAQ",
      "Контакты",
    ]);
  });

  test("the Workspace shows only workspace destinations", async ({ page }) => {
    await page.goto("/app/projects");
    await openNav(page);
    await expect(page.locator(NAV_ITEM)).toHaveText(["Проекты", "Создать проект"]);
    await expect(page.locator(SIDEBAR)).not.toContainText("Возможности");
  });

  test("an open project shows only its own sections plus a way back", async ({ page }) => {
    await createProject(page, "Espresso Day");
    await openNav(page);
    await expect(page.locator(NAV_ITEM)).toHaveText(["Обзор", "AI-консультант", "Дизайн", "Процесс", "Цены"]);
    await expect(page.locator(".shell-back")).toHaveText(/Все проекты/);
    await expect(page.locator(SIDEBAR)).not.toContainText("Кейсы");
    // The project's five sections exist once, not as a sidebar plus a duplicate tab row.
    await expect(page.locator(".workspace-tabs")).toHaveCount(0);
  });
});

test.describe("the logo is the universal way home", () => {
  test("returns to the Hero from deep inside a project", async ({ page }) => {
    await createProject(page, "Espresso Day");
    await openNav(page);
    // Deliberately not the Design section: a generated project opens its concept in a modal, and
    // a modal is supposed to hold focus — the logo is reachable again as soon as it is closed.
    await page.locator(NAV_ITEM, { hasText: "Процесс" }).first().click();
    await page.waitForURL("**/workflow");

    await page.locator(".shell-brand").click();
    await page.waitForURL(/\/$/, { timeout: 10_000 });
    await expect(page.locator(".shell-title")).toHaveText("Главная");
    // Specifically the Hero — not merely the route.
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBeLessThan(150);
  });

  test("scrolls back to the Hero when already on the landing", async ({ page }) => {
    await page.goto("/");
    await openNav(page);
    await page.locator(NAV_ITEM, { hasText: "Контакты" }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBeGreaterThan(400);

    await page.locator(".shell-brand").click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBeLessThan(150);
  });
});

test.describe("routing has no dead ends", () => {
  test("landing to Workspace and back, in one tab", async ({ page, context }) => {
    await page.goto("/");
    await openNav(page);
    await page.locator(".shell-sidebar-exit").click();
    await page.waitForURL("**/app/projects");
    expect(context.pages()).toHaveLength(1);

    await openNav(page);
    await page.locator(".shell-sidebar-exit").click();
    await page.waitForURL(/\/$/);
    expect(context.pages()).toHaveLength(1);
  });

  test("the back button restores the previous context and its sidebar", async ({ page }) => {
    await createProject(page, "Espresso Day");
    await openNav(page);
    await page.locator(NAV_ITEM, { hasText: "Процесс" }).first().click();
    await page.waitForURL("**/workflow");

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/projects\/[^/]+$/);
    await openNav(page);
    await expect(page.locator(NAV_ITEM)).toHaveCount(5);
  });

  test("a project leads back to the full project list", async ({ page }) => {
    await createProject(page, "Espresso Day");
    await openNav(page);
    await page.locator(".shell-back").click();
    await page.waitForURL("**/app/projects");
    await expect(page.locator(".shell-title")).toHaveText("Workspace");
  });
});

test.describe("выдвижная панель прокручивается", () => {
  test("на низком экране доступен последний пункт, а фон заперт", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "на десктопе панель закреплена, а не выдвижная");
    // Панель была колонкой на всю высоту без overflow: на коротком окне нижние пункты просто
    // не существовали на экране и добраться до них было нечем.
    await page.setViewportSize({ width: 360, height: 320 });
    await page.goto("/");
    await openNav(page);

    const scroll = page.locator(".shell-sidebar-scroll");
    await expect(scroll).toBeVisible();
    const metrics = await scroll.evaluate((el) => ({ scrollable: el.scrollHeight > el.clientHeight + 1 }));
    expect(metrics.scrollable, "области прокрутки нечего прокручивать — проверка бессмысленна").toBe(true);

    // Низ с выходом и аккаунтом виден всегда: до него не надо долистывать.
    const foot = await page.locator(".shell-sidebar-foot").boundingBox();
    expect(foot!.y + foot!.height).toBeLessThanOrEqual(320 + 1);

    // Последний пункт достижим прокруткой.
    await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(page.locator(".shell-sidebar .shell-nav-item").last()).toBeVisible();

    // Страница под панелью не едет. Проверяем попыткой прокрутить окно программно, а не
    // колесом: колеса нет в мобильном WebKit, а замок должен держать любой способ.
    const before = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);

    // И возвращается к обычному поведению после закрытия.
    await page.locator(".shell-sidebar-close").click();
    await expect(page.locator(".shell-sidebar")).not.toHaveClass(/is-open/);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe("hidden");
  });

  test("панель не создаёт горизонтальной прокрутки", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "проверка для узких экранов");
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/");
    await openNav(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, "панель вылезает за ширину экрана").toBe(false);
  });
});

test.describe("responsive sidebar", () => {
  test("desktop pins the sidebar open with no hamburger", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only behaviour");
    await page.goto("/app/projects");
    await expect(page.locator(SIDEBAR)).toBeVisible();
    await expect(page.locator(".shell-menu-button")).toBeHidden();
  });

  test("mobile hides the sidebar until the hamburger is used, and closes it on navigation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only behaviour");
    await page.goto("/app/projects");
    await expect(page.locator(SIDEBAR)).toBeHidden();

    await page.locator(".shell-menu-button").click();
    await expect(page.locator(SIDEBAR)).toBeVisible();

    await page.locator(NAV_ITEM, { hasText: "Создать проект" }).click();
    await page.waitForURL("**/app/new");
    await expect(page.locator(SIDEBAR)).toBeHidden();
  });
});
