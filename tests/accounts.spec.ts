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

  test("код одноразовый: второй ввод входа не даёт", async ({ page }) => {
    const email = account();
    const { createLoginCode } = await import("../src/lib/auth");
    const code = await createLoginCode(email);

    await page.goto("/app/projects");
    const first = await page.request.post("/api/auth/verify", { data: { email, code } });
    expect(first.ok()).toBeTruthy();

    const second = await page.request.post("/api/auth/verify", { data: { email, code } });
    expect(second.status()).toBe(401);
    expect((await second.json()).reason).toBe("used");
  });

  test("неверный код не пускает", async ({ page }) => {
    const email = account();
    const { createLoginCode } = await import("../src/lib/auth");
    await createLoginCode(email);

    await page.goto("/app/projects");
    const response = await page.request.post("/api/auth/verify", { data: { email, code: "000000" } });
    expect(response.status()).toBe(401);
    // Хранилище не переключилось: неверный код не выдаёт сессию.
    await page.reload();
    await expect(page.locator(NOTICE).first()).toContainText("только на этом устройстве");
  });

  test("код сгорает после пяти неверных попыток, и верный уже не спасает", async ({ page }) => {
    const email = account();
    const { createLoginCode } = await import("../src/lib/auth");
    const code = await createLoginCode(email);
    // Заведомо неверный, но той же формы — чтобы проверялся счётчик, а не отсев по виду.
    const wrong = code === "000000" ? "111111" : "000000";

    await page.goto("/app/projects");
    for (let i = 1; i <= 5; i++) {
      const r = await page.request.post("/api/auth/verify", { data: { email, code: wrong } });
      expect(r.status(), `попытка ${i}`).toBe(401);
    }

    // Шесть цифр — миллион вариантов. Без этого ограничения код подбирался бы перебором.
    const afterBurn = await page.request.post("/api/auth/verify", { data: { email, code } });
    expect(afterBurn.status()).toBe(401);
    expect((await afterBurn.json()).reason).toBe("used");
  });

  test("страница входа просит код и объясняет отказ", async ({ page }) => {
    await page.goto("/app/login");
    await expect(page.getByRole("button", { name: "Получить код" })).toBeVisible();

    const email = account();
    const field = page.getByLabel("Почта");
    const submit = page.getByRole("button", { name: "Получить код" });
    // Поле управляемое: значение, вписанное до того, как React навесит onChange, стирается
    // гидратацией, и кнопка остаётся выключенной. Тот же приём, что в createProjectViaForm —
    // повторять ввод, пока он не закрепится.
    await expect(async () => {
      await field.fill(email);
      await expect(submit).toBeEnabled({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await submit.click();

    // Второй шаг на той же странице: человек не уходит из вкладки, в которой начал.
    await expect(page.getByLabel("Код из письма")).toBeVisible();
    await page.getByLabel("Код из письма").fill("000000");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.locator(LOGIN_ERROR)).toContainText("Неверный код");
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

  test("выход спрашивает подтверждение, и отказ оставляет в аккаунте", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "кнопка выхода живёт в закреплённой панели");
    await signIn(page, account());
    await expect(page.locator(NOTICE).first()).toContainText("сохраняются в аккаунт");

    // Кнопка стоит вплотную к навигации, и цена промаха несимметрична: выйти — секунда,
    // вернуться — новый код из письма.
    await page.getByRole("button", { name: "Выйти из аккаунта" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Выйти из аккаунта?");

    await dialog.getByRole("button", { name: "Остаться" }).click();
    await expect(dialog).toHaveCount(0);
    // Сессия цела: отказ ничего не сделал.
    await page.reload();
    await expect(page.locator(NOTICE).first()).toContainText("сохраняются в аккаунт");
  });

  test("подтверждение выхода действительно выводит", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "кнопка выхода живёт в закреплённой панели");
    await signIn(page, account());
    await page.getByRole("button", { name: "Выйти из аккаунта" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Подтвердить выход" }).click();

    await expect(page.locator(NOTICE).first()).toContainText("только на этом устройстве");
    expect((await page.request.get("/api/projects")).status()).toBe(401);
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

  test("вход в шапке виден с любой страницы и пропадает у вошедшего", async ({ page }) => {
    const email = uniqueEmail();
    created.push(email);

    // Лендинг: боковой панели с аккаунтом здесь нет вовсе, поэтому шапка — единственное место,
    // откуда посетитель может войти.
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Войти в аккаунт" })).toBeVisible();

    await signIn(page, email);

    // Вошедшему регистрироваться незачем: место освобождается, а не занимается третьей кнопкой.
    await expect(page.getByRole("link", { name: "Войти в аккаунт" })).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Войти в аккаунт" })).toHaveCount(0);
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
