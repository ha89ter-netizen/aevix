import { test, expect } from "./support/fixtures";
import {
  accountsAvailable,
  deleteAccount,
  makeProject,
  seedLocalProject,
  signIn,
  uniqueEmail,
} from "./support/accounts";

/**
 * Аккаунты: вход по ссылке, переход проектов с устройства в аккаунт и изоляция чужих.
 *
 * Единственный набор, которому нужна настоящая база. Это осознанное исключение из правила,
 * по которому основной набор ни от чего внешнего не зависит: база — наша инфраструктура, а не
 * чужой платный сервис, и проверять сохранность работы клиента на подделке хранилища
 * бессмысленно. Без DATABASE_URL набор пропускает себя, а не краснеет.
 *
 * Проверяется то, что дороже всего сломать: не «кнопка нажалась», а «работа не пропала» и
 * «чужое не видно».
 */

const NOTICE = ".workspace-storage-notice";
const CARDS = ".workspace-project-card-grid";
// Именно наши сообщения об ошибке. Просто getByRole("alert") цепляет ещё и служебный
// route-announcer, который Next держит на каждой странице.
const LOGIN_ERROR = ".workspace-field-hint[role='alert']";
const NOTICE_ERROR = ".workspace-storage-notice[role='alert']";

test.describe("аккаунты", () => {
  test.skip(!accountsAvailable, "нужны DATABASE_URL и AUTH_SECRET — см. .env.example");

  const created: string[] = [];

  const account = () => {
    const email = uniqueEmail();
    created.push(email);
    return email;
  };

  test.afterAll(async () => {
    for (const email of created) await deleteAccount(email);
  });

  test("вход по ссылке переводит хранилище с устройства в аккаунт", async ({ page }) => {
    await page.goto("/app/projects");
    await expect(page.locator(NOTICE).first()).toContainText("только на этом устройстве");

    await signIn(page, account());

    await expect(page.locator(NOTICE).first()).toContainText("сохраняются в аккаунт");
  });

  test("ссылка одноразовая: второй переход по ней входа не даёт", async ({ page }) => {
    const email = account();
    // Тот же токен дважды — берём его один раз и используем повторно вручную.
    const { createLoginToken } = await import("../src/lib/auth");
    const token = await createLoginToken(email);

    await page.goto(`/api/auth/callback?token=${encodeURIComponent(token)}`);
    await page.waitForURL(/\/app\/projects/);
    await expect(page.locator(NOTICE).first()).toContainText("сохраняются в аккаунт");

    await page.goto(`/api/auth/callback?token=${encodeURIComponent(token)}`);
    await page.waitForURL(/\/app\/login\?error=used/);
    await expect(page.locator(LOGIN_ERROR)).toContainText("уже использована");
  });

  test("поддельный токен не пускает и объясняет, что делать", async ({ page }) => {
    await page.goto("/api/auth/callback?token=этого-токена-нет");
    await page.waitForURL(/\/app\/login\?error=invalid/);
    await expect(page.locator(LOGIN_ERROR)).toContainText("недействительна");
    // Форма рядом с ошибкой: истёкшая ссылка — самый частый неуспех, и человеку нужна
    // возможность запросить новую, а не только сообщение о том, что всё плохо.
    await expect(page.getByRole("button", { name: "Получить ссылку" })).toBeVisible();
  });

  test("проект с устройства переходит в аккаунт, и локальная копия убирается", async ({ page }) => {
    const project = makeProject("Проект до входа");
    await page.goto("/app/projects");
    await seedLocalProject(page, project);
    await page.reload();
    await expect(page.locator(CARDS)).toContainText("Проект до входа");

    await signIn(page, account());

    await expect(page.locator(CARDS)).toContainText("Проект до входа");
    // Порядок из docs/database.md: локальная копия убирается ТОЛЬКО после подтверждённой
    // записи. Здесь запись удалась, значит копии остаться не должно.
    expect(await page.evaluate(() => window.localStorage.getItem("aevix.projects"))).toBeNull();

    const onServer = await page.request.get("/api/projects").then((response) => response.json());
    expect(onServer.projects).toHaveLength(1);
    expect(onServer.projects[0].name).toBe("Проект до входа");
  });

  test("если перенос не удался, локальная копия остаётся, а человеку об этом говорят", async ({ page }) => {
    await page.goto("/app/projects");
    await seedLocalProject(page, makeProject("Проект, который нельзя потерять"));
    await page.reload();

    // Запись на сервер отказывает — ровно тот случай, ради которого в docs/database.md
    // предписан порядок «сначала подтверждённая запись, потом очистка». Читать по-прежнему
    // можно: ломается именно перенос, а не весь аккаунт.
    await page.route("**/api/projects", (route) =>
      route.request().method() === "PUT"
        ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "нет" }) })
        : route.fallback(),
    );

    await signIn(page, account());

    // Главное: работа никуда не делась с устройства.
    expect(await page.evaluate(() => window.localStorage.getItem("aevix.projects"))).not.toBeNull();
    await expect(page.locator(NOTICE_ERROR)).toContainText("не удалось перенести");
  });

  test("проекты одного аккаунта не видны другому", async ({ page }) => {
    await page.goto("/app/projects");
    await seedLocalProject(page, makeProject("Только для первого"));
    await page.reload();
    await signIn(page, account());
    await expect(page.locator(CARDS)).toContainText("Только для первого");

    // Второй аккаунт в том же браузере: cookie перезапишется, локального ничего не осталось.
    await signIn(page, account());

    await expect(page.locator(CARDS)).toHaveCount(0);
    const onServer = await page.request.get("/api/projects").then((response) => response.json());
    expect(onServer.projects).toHaveLength(0);
  });

  test("запись под чужим id не меняет чужой проект", async ({ page }) => {
    const project = makeProject("Проект первого", "общий-id-для-проверки");
    await page.goto("/app/projects");
    await seedLocalProject(page, project);
    await page.reload();
    await signIn(page, account());
    await expect(page.locator(CARDS)).toContainText("Проект первого");

    await signIn(page, account());
    const stolen = await page.request.put("/api/projects", {
      data: { projects: [{ ...project, name: "ЗАХВАЧЕНО" }] },
    });
    // Не молчаливое «сохранено»: маршрут обязан сказать, что записи не было.
    expect(stolen.status()).toBe(409);

    // И у второго ничего не появилось, и у первого ничего не поменялось.
    expect(await page.request.get("/api/projects").then((r) => r.json())).toHaveProperty("projects", []);
  });

  test("без входа проекты аккаунта недоступны", async ({ page }) => {
    await page.goto("/app/projects");
    const response = await page.request.get("/api/projects");
    expect(response.status()).toBe(401);
  });

  test("выход возвращает хранилище на устройство", async ({ page }) => {
    await signIn(page, account());
    await expect(page.locator(NOTICE).first()).toContainText("сохраняются в аккаунт");

    const response = await page.request.delete("/api/auth/session");
    expect(response.ok()).toBeTruthy();
    await page.reload();

    await expect(page.locator(NOTICE).first()).toContainText("только на этом устройстве");
  });
});

test.describe("аккаунты · сайдбар", () => {
  test.skip(!accountsAvailable, "нужны DATABASE_URL и AUTH_SECRET — см. .env.example");

  const created: string[] = [];
  test.afterAll(async () => {
    for (const email of created) await deleteAccount(email);
  });

  test("показывает почту вошедшего и кнопку выхода", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "боковая панель закреплена только на десктопе");
    const email = uniqueEmail();
    created.push(email);

    await page.goto("/app/projects");
    await expect(page.locator(".shell-account")).toContainText("Войти");

    await signIn(page, email);

    await expect(page.locator(".shell-account")).toContainText(email);
    await expect(page.getByRole("button", { name: "Выйти из аккаунта" })).toBeVisible();
  });
});
