import { test, expect, type Page } from "./support/fixtures";
import { ENTRY, SITE } from "./support/routes";
import { landingSections } from "../src/components/shell/shell-nav";

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

/**
 * Проходит мастер целиком и возвращает URL проекта.
 *
 * Мастер стал пятишаговым, поэтому помощник ведёт по шагам, а не заполняет одну форму.
 * Управляемое поле имени по-прежнему может проглотить ввод до гидратации — отсюда повтор.
 */
async function createProject(page: Page, name: string, goal = "Получать заявки") {
  await page.goto("/app/new");
  const field = page.getByPlaceholder("Например: Барбершоп FORMA");
  const next = page.getByRole("button", { name: /Дальше/ });
  await expect(async () => {
    await field.fill(name);
    await expect(next).toBeEnabled({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await next.click();

  await page.getByRole("button", { name: goal, exact: true }).click();
  await page.getByRole("button", { name: /Показать структуру/ }).click();
  await expect(page.locator(".brief-structure-row").first()).toBeVisible();
  await page.getByRole("button", { name: /Дальше/ }).click();   // структура -> вид
  await page.getByRole("button", { name: /Дальше/ }).click();   // вид -> подтверждение
  await page.getByRole("button", { name: /Создать проект/ }).click();
  await page.waitForURL(/\/app\/projects\/[^/]+$/);
  await expect(page.locator(".overview-card-grid")).toBeVisible({ timeout: 20_000 });
  }

test.describe("one header, one job per zone", () => {
  test("the right side carries one call to action, plus a quieter way in", async ({ page }) => {
    await page.goto(SITE);
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
    await page.goto(SITE);
    await expect(page.locator(".shell-title")).toHaveText("Главная");

    await page.goto("/app/projects");
    await expect(page.locator(".shell-title")).toHaveText("Workspace");

    await page.goto("/app/new");
    await expect(page.locator(".shell-title")).toHaveText("Создать проект");
  });
});

test.describe("sidebar modes are mutually exclusive", () => {
  test("the landing shows only landing sections", async ({ page }) => {
    await page.goto(SITE);
    await openNav(page);
    // Ожидание берётся из канонического реестра, а не из второй копии списка: копия однажды уже
    // разошлась со страницей и осталась зелёной. Что реестр совпадает с разметкой, проверяет
    // отдельный тест ниже.
    await expect(page.locator(NAV_ITEM)).toHaveText(
      landingSections.filter((section) => section.label).map((section) => section.label!),
    );
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

test.describe("знак бренда — глобальный путь на входной экран", () => {
  /**
   * Продуктовое решение Journey pass: логотип ведёт на `/`, из любой точки продукта.
   *
   * До него на входной экран не вело НИ ОДНОЙ ссылки: на лендинге логотип прокручивал страницу
   * вверх, из Workspace вёл на `/platform`. Попасть на `/` можно было один раз, вернуться —
   * только набрав адрес руками, хотя там живут локализация и живая карта возможностей.
   */
  test("из глубины проекта ведёт на входной экран", async ({ page }) => {
    await createProject(page, "Espresso Day");
    await openNav(page);
    // Deliberately not the Design section: a generated project opens its concept in a modal, and
    // a modal is supposed to hold focus — the logo is reachable again as soon as it is closed.
    await page.locator(NAV_ITEM, { hasText: "Процесс" }).first().click();
    await page.waitForURL("**/workflow");

    await page.locator(".shell-brand").click();
    await page.waitForURL((url) => new URL(url).pathname === ENTRY, { timeout: 10_000 });
    await expect(page.locator(".entry-screen")).toBeVisible();
  });

  test("с лендинга тоже ведёт на входной экран, а не прокручивает вверх", async ({ page }) => {
    await page.goto(SITE);
    await openNav(page);
    await page.locator(NAV_ITEM, { hasText: "Контакты" }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBeGreaterThan(400);

    await page.locator(".shell-brand").click();
    await page.waitForURL((url) => new URL(url).pathname === ENTRY, { timeout: 10_000 });
    await expect(page.locator(".entry-screen")).toBeVisible();
  });

  test("прокрутку к первому экрану делает пункт «Главная», и она не потеряна", async ({ page }) => {
    // Логотип забрал себе «домой» — значит у якорного поведения должен остаться свой носитель,
    // иначе взамен одной потерянной возможности появилась бы другая.
    await page.goto(SITE);
    await openNav(page);
    await page.locator(NAV_ITEM, { hasText: "Контакты" }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBeGreaterThan(400);

    await openNav(page);
    await page.locator(NAV_ITEM, { hasText: "Главная" }).first().click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBeLessThan(150);
    // Остались на лендинге: якорь — это якорь, а не переход.
    expect(new URL(page.url()).pathname).toBe(SITE);
  });
});

test.describe("routing has no dead ends", () => {
  test("landing to Workspace and back, in one tab", async ({ page, context }) => {
    await page.goto(SITE);
    await openNav(page);
    await page.locator(".shell-sidebar-exit").click();
    await page.waitForURL("**/app/projects");
    expect(context.pages()).toHaveLength(1);

    await openNav(page);
    // «На сайт AEVIX» ведёт на основной сайт, а не на входной экран: из Workspace человек идёт
    // читать про продукт, а не смотреть первое впечатление заново.
    await page.locator(".shell-sidebar-exit").click();
    await page.waitForURL(`**${SITE}`);
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
    await page.goto(SITE);
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
    await page.goto(SITE);
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

test.describe("оглавление лендинга не врёт о странице", () => {
  /**
   * Сторож против того, что уже случилось: список пунктов был отдельной копией правды и разошёлся
   * со страницей. «Как работает» стояло третьим пунктом, а лежало на 8713px — ниже «Кейсов»
   * (6967) и «Цен» (4241), так что три пункта подряд везли против направления чтения.
   *
   * Проверка НЕ сравнивает список со вторым списком — она читает настоящую разметку. Если кто-то
   * переставит сцены в `LandingExperience`, не тронув реестр, тест покраснеет; сравнение двух
   * копий осталось бы зелёным, как и осталось в прошлый раз.
   */
  test("порядок пунктов совпадает с порядком разделов на странице", async ({ page }) => {
    await page.goto(SITE);
    await openNav(page);

    // Пункты лендинга — кнопки (прокрутка, а не переход), поэтому цель берётся по подписи из
    // реестра. Само соответствие реестра разметке доказывает отдельный тест — вместе они и
    // закрывают дыру: ни одна из двух проверок не сравнивает список со своей же копией.
    const labels = await page.locator(NAV_ITEM).allInnerTexts();
    const targets = labels.map((label) => {
      const section = landingSections.find((item) => item.label === label.trim());
      expect(section, `пункт «${label.trim()}» не найден в реестре разделов`).toBeTruthy();
      return section!.id;
    });
    expect(targets.length).toBeGreaterThan(3);

    const tops = await page.evaluate((ids: string[]) =>
      ids.map((id) => {
        const el = document.getElementById(id);
        return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
      }),
      targets,
    );

    // Каждый пункт ведёт в настоящий раздел…
    expect(tops.every((top) => top !== null), `нет секций для: ${JSON.stringify(targets)}`).toBe(true);
    // …и ни один следующий пункт не стоит на странице ВЫШЕ предыдущего.
    const sorted = [...(tops as number[])].sort((a, b) => a - b);
    expect(tops, `порядок меню: ${JSON.stringify(targets)}`).toEqual(sorted);
  });

  test("подсветка не приписывает человека «Главной», пока он читает другой раздел", async ({ page }) => {
    // Разделы `#ai-анализ` и `#проблемы` не были представлены в меню, и наблюдатель о них не
    // знал: активным оставался предыдущий пункт. На замере это давало «Главную» примерно на
    // 2400 пикселях прокрутки — двух полных экранах чтения.
    await page.goto(SITE);
    // Панель НЕ открываем: на телефоне она запирает прокрутку (`body.position: fixed`), и
    // наблюдатель положения при открытой панели просто не сработал бы. Активный пункт — факт
    // разметки, читаем его напрямую, а не глазами.
    const active = () =>
      page.evaluate(
        (selector: string) =>
          document.querySelector(`${selector}[aria-current="true"], ${selector}.is-active`)?.textContent?.trim() ?? "",
        NAV_ITEM,
      );

    for (const id of ["ai-анализ", "проблемы", "кто-мы"]) {
      await page.evaluate((sectionId: string) => {
        const el = document.getElementById(sectionId)!;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 120);
      }, id);
      await expect.poll(active, { timeout: 8000 }).not.toBe("Главная");
    }
  });

  test("реестр разделов совпадает с настоящей разметкой — по составу и по порядку", async ({ page }) => {
    // Единственный источник правды о структуре лендинга — `landingSections`. Здесь он сверяется
    // не со второй копией списка, а с самой страницей: добавленная сцена, убранная сцена или
    // переставленные сцены красят тест. Именно этого не умела прежняя проверка, которая сравнивала
    // отрисованные подписи с их же копией внутри теста.
    await page.goto(SITE);
    const onPage = await page.$$eval("main section[id]", (nodes) => nodes.map((node) => node.id));
    expect(onPage).toEqual(landingSections.map((section) => section.id));
  });

  test("раздел вне меню отдаёт подсветку своему представителю, а не молчит", async ({ page }) => {
    const hidden = landingSections.filter((section) => !section.label);
    test.skip(hidden.length === 0, "все разделы вынесены в меню — представителю нечего проверять");
    await page.goto(SITE);
    for (const section of hidden) {
      expect(section.representedBy, `${section.id} вне меню и без представителя`).toBeTruthy();
      const representative = landingSections.find((item) => item.id === section.representedBy);
      expect(representative?.label, `представитель ${section.representedBy} сам не в меню`).toBeTruthy();

      await page.evaluate((sectionId: string) => {
        const el = document.getElementById(sectionId)!;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 120);
      }, section.id);
      await expect
        .poll(
          () =>
            page.evaluate(
              (selector: string) =>
                document.querySelector(`${selector}[aria-current="true"], ${selector}.is-active`)?.textContent?.trim() ?? "",
              NAV_ITEM,
            ),
          { timeout: 8000 },
        )
        .toBe(representative!.label);
    }
  });
});

test.describe("структура документа и заголовки вкладок", () => {
  /**
   * Два дефекта аудита. Первый: шапка объявляла `<h1>` на КАЖДОЙ странице, и на лендинге, где у
   * героя есть собственный, их становилось два — в структуре документа страница называлась
   * «Главная», а не тем, что на ней написано. Второй: все поверхности Workspace наследовали один
   * заголовок вкладки, и пять открытых вкладок не различались ни в браузере, ни в истории.
   */
  test("на лендинге ровно один h1, и он принадлежит содержанию", async ({ page }) => {
    await page.goto(SITE);
    const headings = await page.$$eval("h1", (nodes) => nodes.map((node) => node.textContent?.trim() ?? ""));
    expect(headings).toHaveLength(1);
    // Заголовок героя, а не служебная подпись раздела в шапке.
    expect(headings[0]).not.toBe("Главная");
    expect(headings[0].length).toBeGreaterThan(10);
  });

  test("у каждой поверхности Workspace ровно один h1", async ({ page }) => {
    for (const route of ["/app/projects", "/app/new", "/app/login", "/app/settings"]) {
      await page.goto(route);
      const count = await page.locator("h1").count();
      expect(count, `${route}: h1 = ${count}`).toBe(1);
    }
  });

  test("у каждого раздела проекта ровно один h1", async ({ page }) => {
    // «Процесс» приносил собственный h1 поверх подписи оболочки — два заголовка документа на
    // одной странице. Проверяются все пять разделов, а не только он.
    await createProject(page, "Заголовки Тест");
    const url = page.url();
    for (const suffix of ["", "/ai-consultant", "/design", "/workflow", "/pricing"]) {
      await page.goto(`${url}${suffix}`);
      await expect(page.locator(".shell-title")).toBeVisible();
      // Опрос, а не одиночное чтение: раздел проекта монтируется после оболочки, и подсчёт в
      // этот момент мерил бы гонку. Настоящая ошибка от этого не спрячется — лишний или
      // пропавший h1 останется на месте и опрос его дождётся.
      await expect
        .poll(() => page.locator("h1").count(), { timeout: 10_000, message: `${suffix || "/обзор"}` })
        .toBe(1);
    }
  });

  test("заголовки вкладок различают поверхности Workspace", async ({ page }) => {
    const titles: Record<string, string> = {};
    for (const route of ["/app/projects", "/app/new", "/app/login", "/app/settings", "/app/profile"]) {
      await page.goto(route);
      titles[route] = await page.title();
    }
    const values = Object.values(titles);
    expect(new Set(values).size, `заголовки: ${JSON.stringify(titles)}`).toBe(values.length);
    // И ни один не остался общим заголовком приложения.
    for (const [route, title] of Object.entries(titles)) {
      expect(title, route).not.toBe("AEVIX — цифровые системы для малого бизнеса");
    }
  });
});
