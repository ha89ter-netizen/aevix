import { test, expect } from "./support/fixtures";
import { SITE } from "./support/routes";
import {
  accountsAvailable,
  deleteAccount,
  makeProject,
  seedLocalProject,
  signIn,
  uniqueEmail,
} from "./support/accounts";

/**
 * Аккаунты: вход по коду, переход проектов с устройства в аккаунт и изоляция чужих.
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

  test("вход переводит хранилище с устройства в аккаунт и называет его", async ({ page }) => {
    await page.goto("/app/projects");
    await expect(page.locator(NOTICE).first()).toContainText("только на этом устройстве");

    const email = account();
    await signIn(page, email);

    // Плашка теперь называет владельца поимённо. Это не косметика: на общем компьютере «проекты
    // сохраняются в аккаунт» не отвечало на вопрос, в чей именно, — поэтому и проверяется, что
    // адрес виден, а не только факт входа.
    await expect(page.locator(NOTICE).first()).toContainText("Проекты аккаунта");
    await expect(page.locator(NOTICE).first()).toContainText(email);
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
    // Вход по коду стал восстановлением и живёт за ссылкой «Забыли пароль?»: основной путь
    // теперь пароль.
    await page.goto("/app/login");
    await page.getByRole("button", { name: /Забыли пароль/ }).click();
    await expect(page.getByRole("button", { name: "Получить код" })).toBeVisible();

    const email = account();
    const field = page.getByLabel("Почта", { exact: true });
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
    await page.getByRole("button", { name: /Подтвердить код/ }).click();
    await expect(page.locator(".auth-error")).toContainText("Неверный код");
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
    // Идентификатор — свой на каждый прогон, а не постоянная строка. Постоянная переживала
    // оборванный прогон: `afterAll` не успевал прибрать аккаунт, строка оставалась в базе с
    // прежним владельцем, и тест падал уже НАВСЕГДА, притворяясь дефектом продукта. Оба
    // обращения ниже используют один и тот же объект, поэтому id внутри прогона общий — ровно
    // это тест и проверяет.
    const project = makeProject("Проект первого");
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
    test.skip(testInfo.project.name !== "desktop", "меню аккаунта раскрывается на широком экране");
    const email = account();
    await signIn(page, email);
    await expect(page.locator(NOTICE).first()).toContainText(email);

    // Кнопка стоит вплотную к навигации, и цена промаха несимметрична: выйти — секунда,
    // вернуться — новый код из письма.
    await page.locator(".shell-avatar").click();
    await page.getByRole("menuitem", { name: "Выйти" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Выйти из аккаунта?");

    await dialog.getByRole("button", { name: "Остаться" }).click();
    await expect(dialog).toHaveCount(0);
    // Сессия цела: отказ ничего не сделал.
    await page.reload();
    await expect(page.locator(NOTICE).first()).toContainText(email);
  });

  test("окно выхода — по центру экрана, а не в коробке шапки", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "меню аккаунта раскрывается на широком экране");
    await signIn(page, account());
    await page.locator(".shell-avatar").click();
    await page.getByRole("menuitem", { name: "Выйти" }).click();

    // Причина прежнего дефекта: `backdrop-filter` у шапки создавал новый содержащий блок для
    // `position: fixed`, и «весь экран» превращался в коробку шапки. Проверяется именно это —
    // затемнение обязано покрывать окно целиком, а окно висеть прямо в body, а не внутри шапки.
    const scrim = page.locator(".dialog-scrim");
    await expect(scrim).toBeVisible();
    const cover = await scrim.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        viewport: { w: window.innerWidth, h: window.innerHeight },
        insideHeader: Boolean(el.closest(".shell-header")),
        parentIsBody: el.parentElement === document.body,
      };
    });
    expect(cover.insideHeader).toBe(false);
    expect(cover.parentIsBody).toBe(true);
    expect(cover.width).toBe(cover.viewport.w);
    expect(cover.height).toBe(cover.viewport.h);

    // И само окно — по центру, а не прижато к краю.
    const panel = await page.locator(".dialog-panel").boundingBox();
    const centreOffset = Math.abs(panel!.x + panel!.width / 2 - cover.viewport.w / 2);
    expect(centreOffset).toBeLessThan(2);

    // Фокус внутри диалога и не убегает наружу по Tab.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest(".dialog-panel")))).toBe(true);

    // Escape закрывает и возвращает фокус туда, откуда пришли.
    await page.keyboard.press("Escape");
    await expect(page.locator(".dialog-panel")).toHaveCount(0);
  });

  test("подтверждение выхода действительно выводит", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "кнопка выхода живёт в закреплённой панели");
    await signIn(page, account());
    await page.locator(".shell-avatar").click();
    await page.getByRole("menuitem", { name: "Выйти" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Подтвердить выход" }).click();

    await expect(page.locator(NOTICE).first()).toContainText("только на этом устройстве");
    expect((await page.request.get("/api/projects")).status()).toBe(401);
  });

  test("выход возвращает хранилище на устройство", async ({ page }) => {
    const email = account();
    await signIn(page, email);
    await expect(page.locator(NOTICE).first()).toContainText(email);

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
    await page.goto(SITE);
    await expect(page.getByRole("link", { name: "Войти в аккаунт" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Регистрация/ })).toBeVisible();

    await signIn(page, email);

    // Вошедшему регистрироваться незачем: место освобождается, а не занимается третьей кнопкой.
    await expect(page.getByRole("link", { name: "Войти в аккаунт" })).toHaveCount(0);
    await page.goto(SITE);
    await expect(page.getByRole("link", { name: "Войти в аккаунт" })).toHaveCount(0);
  });

  test("сайдбар показывает вошедшего, а выход живёт в меню аватара и работает", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "боковая панель закреплена только на десктопе");
    const email = uniqueEmail();
    created.push(email);

    await page.goto("/app/projects");
    await expect(page.locator(".shell-account")).toContainText("Войти");

    await signIn(page, email);

    // В сайдбаре — кто вошёл. Второй кнопки выхода здесь больше нет намеренно: одно действие
    // должно жить в одном месте, иначе его дважды можно нажать по ошибке.
    await expect(page.locator(".shell-account")).toContainText(email);
    await expect(page.locator(".shell-account button")).toHaveCount(0);

    // Выход переехал в меню аватара — и проверяется он целиком, до последствия, а не по факту
    // существования кнопки: иначе тест зеленел бы и с меню, которое ничего не делает.
    await page.locator(".shell-avatar").click();
    await expect(page.getByRole("menuitem", { name: "Профиль" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Выйти" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Подтвердить выход" }).click();

    await expect(page.locator(NOTICE).first()).toContainText("только на этом устройстве");
    expect((await page.request.get("/api/projects")).status()).toBe(401);
  });
});
