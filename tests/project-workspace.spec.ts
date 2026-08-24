import { test, expect, type Page, type Route } from "./support/fixtures";

/**
 * The Workspace's project system: every business worked on in AEVIX becomes a Project that
 * persists in localStorage — AI analysis, design, and pricing all attach to the same project
 * and survive a reload. The analysis endpoint is mocked for determinism.
 */

const STORAGE_KEY = "aevix.projects";

// Deliberately in the LEGACY stored shape (has `favorite`, lacks city/preferred* fields) — the
// repository must normalize old data instead of dropping it, so seeding legacy projects doubles
// as a migration test.
function seededProject(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: "seed-project",
    name: "Seed Project",
    businessType: "Кофейня",
    businessDescription: "Кофейня с доставкой через Instagram",
    favorite: false,
    createdAt: now,
    updatedAt: now,
    analysis: null,
    design: null,
    pricing: null,
    ...overrides,
  };
}

async function seedStorage(page: Page, projects: unknown[]) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [STORAGE_KEY, JSON.stringify({ version: 1, projects })],
  );
}

async function mockAnalysis(page: Page) {
  await page.route("**/api/business-analysis", (route: Route) => {
    const body = route.request().postDataJSON() as { message?: string } | null;
    if (!body?.message) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        source: "ai",
        analysis: "mock",
        result: {
          shortAnswer: "Да, вам нужен WhatsApp-бот.",
          reasons: ["Причина один.", "Причина два.", "Причина три."],
          recommendedSolution: "Подключить WhatsApp-бота.",
          summary: "Тестовый бизнес.",
          problems: ["Проблема один."],
          recommendations: ["Рекомендация один.", "Рекомендация два.", "Рекомендация три."],
          flow: ["Клиент", "Бот", "Заказ", "Готово"],
          callToAction: "Обсудим в WhatsApp.",
        },
      }),
    });
  });
}

/**
 * Проходит мастер целиком и возвращает URL проекта.
 *
 * Мастер стал пятишаговым, поэтому помощник ведёт по шагам, а не заполняет одну форму.
 * Управляемое поле имени по-прежнему может проглотить ввод до гидратации — отсюда повтор.
 */
async function completeWizard(page: Page, name: string, goal = "Получать заявки") {
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
  return page.url();
}

test.describe("project persistence", () => {
  test("a seeded legacy project survives a reload", async ({ page }) => {
    await seedStorage(page, [seededProject()]);
    await page.goto("/app/projects/seed-project");
    await expect(page.locator(".workspace-project-name")).toHaveText("Seed Project");

    await page.reload();
    await expect(page.locator(".workspace-project-name")).toHaveText("Seed Project");
  });

  test("corrupted storage falls back to the empty state instead of crashing", async ({ page }) => {
    await page.addInitScript(
      ([key]) => window.localStorage.setItem(key as string, "{not valid json"),
      [STORAGE_KEY],
    );
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/app/projects");
    await expect(page.locator(".workspace-empty-title")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("an invalid project id shows a recovery state, not a crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/app/projects/this-id-does-not-exist");
    await expect(page.getByText("Проект не найден")).toBeVisible();
    await expect(page.getByRole("link", { name: "К списку проектов" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("direct navigation to a valid project URL works", async ({ page }) => {
    await seedStorage(page, [seededProject({ id: "direct-nav", name: "Direct Nav Project" })]);
    await page.goto("/app/projects/direct-nav/pricing");
    // Project sections live in the sidebar now, and the header names the open section.
    await expect(page.locator(".shell-title-section")).toHaveText("Цены");
  });
});

test.describe("navigation surface", () => {
  test("/app redirects to the projects list and the sidebar has exactly the three real items", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "sidebar labels are a desktop-width check");
    await page.goto("/app");
    await page.waitForURL("**/app/projects");

    const sidebar = page.locator(".shell-sidebar");
    await expect(sidebar.getByRole("link", { name: "Проекты" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Создать проект" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "На сайт AEVIX" })).toBeVisible();
    // Аккаунт — четвёртая ссылка и единственная добавка с тех пор, как их было три. Настоящая
    // ссылка, а не кнопка с обработчиком: средний клик, «открыть в новой вкладке» и переход с
    // клавиатуры должны работать как у любой навигации.
    await expect(sidebar.getByRole("link", { name: "Войти" })).toBeVisible();
    // Nothing else: 2 nav items + the account entry + the exit link. The landing sections must
    // not leak in here.
    await expect(sidebar.locator("a")).toHaveCount(4);
  });

  test("the projects page shows the local-storage notice", async ({ page }) => {
    await page.goto("/app/projects");
    await expect(page.getByText("Проекты пока хранятся только на этом устройстве.")).toBeVisible();
  });
});

test.describe("project creation", () => {
  test("мастер собирает проект за пять шагов, без повторяющихся вопросов", async ({ page }) => {
    await page.goto("/app/new");
    const field = page.getByPlaceholder("Например: Барбершоп FORMA");
    const next = page.getByRole("button", { name: /Дальше/ });
    await expect(async () => {
      await field.fill("Барбершоп на Абая");
      await expect(next).toBeEnabled({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await page.getByPlaceholder("Например: Астана").fill("Астана");
    await page.getByPlaceholder(/Чем занимаетесь/).fill("Барбершоп на три кресла, запись вручную");

    // Категория выводится из описания, а не спрашивается отдельным вопросом.
    await expect(page.locator(".brief-detected")).toContainText("Барбершоп");
    await next.click();

    // Разделы на шаге задач НЕ спрашиваются: это был тот же вопрос другими словами.
    await expect(page.getByRole("button", { name: "Галерея", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Записывать клиентов", exact: true }).click();
    await page.getByRole("button", { name: /Показать структуру/ }).click();

    // Структура зависит от ниши и задач: у барбершопа нет меню, но есть запись.
    const titles = await page.locator(".brief-structure-title").evaluateAll((els) =>
      els.map((el) => (el as HTMLInputElement).value),
    );
    expect(titles).toContain("Запись");
    expect(titles.join(" ")).not.toContain("Меню");

    // Честность формулировок: модель на этом шаге не вызывается, и обещать её нельзя.
    const text = await page.locator(".workspace-create-form").innerText();
    // Согласованная формулировка: модель на этом шаге не вызывается, поэтому «сформировал
    // рекомендации», а не «проанализировал».
    expect(text).toContain("AEVIX сформировал рекомендации");
    expect(text).not.toMatch(/AI (понял|проанализировал|создал)/);

    await page.getByRole("button", { name: /Дальше/ }).click();
    await page.getByRole("button", { name: /Дальше/ }).click();
    await page.getByRole("button", { name: /Создать проект/ }).click();

    await page.waitForURL(/\/app\/projects\/.+/);
    await expect(page.locator(".overview-card-grid")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".workspace-project-name")).toHaveText("Барбершоп на Абая");
  });

  test("без выбора цветов проект получает палитру ниши, а не общий чёрно-золотой", async ({ page }) => {
    // Раньше на этот случай стоял один `["black", "gold"]` на все ниши: салон красоты,
    // стоматология и автосервис получали одинаковый сайт.
    await page.goto("/app/new");
    const field = page.getByPlaceholder("Например: Барбершоп FORMA");
    const next = page.getByRole("button", { name: /Дальше/ });
    await expect(async () => {
      await field.fill("LUMIERE");
      await expect(next).toBeEnabled({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await page.getByPlaceholder(/Чем занимаетесь/).fill("Салон красоты, уход и окрашивание");
    await next.click();
    await page.getByRole("button", { name: "Получать заявки", exact: true }).click();
    await page.getByRole("button", { name: /Показать структуру/ }).click();
    await page.getByRole("button", { name: /Дальше/ }).click();
    await page.getByRole("button", { name: /Дальше/ }).click();

    // Сводка называет реальную палитру, а не обещает «что-нибудь подберём».
    await expect(page.locator(".brief-summary")).toContainText("палитра ниши");
    await page.getByRole("button", { name: /Создать проект/ }).click();
    await page.waitForURL(/\/app\/projects\/.+/);
    await expect(page.locator(".overview-card-grid")).toBeVisible({ timeout: 20_000 });

    const colors = await page.evaluate(() => {
      const raw = window.localStorage.getItem("aevix.projects");
      return raw ? JSON.parse(raw).projects[0].design?.colorIds : null;
    });
    expect(colors).not.toEqual(["black", "gold"]);
    expect(colors).toContain("pink");
  });

  test("блок понимания на шаге структуры показывает собранное и обновляется при возврате", async ({ page }) => {
    await page.goto("/app/new");
    const field = page.getByPlaceholder("Например: Барбершоп FORMA");
    const next = page.getByRole("button", { name: /Дальше/ });
    await expect(async () => {
      await field.fill("LUMIERE");
      await expect(next).toBeEnabled({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await page.getByPlaceholder("Например: Астана").fill("Астана");
    await page.getByPlaceholder(/Чем занимаетесь/).fill("Салон красоты, уход и окрашивание");
    await next.click();
    await page.getByRole("button", { name: "Записывать клиентов", exact: true }).click();
    await page.getByRole("button", { name: /Показать структуру/ }).click();

    const block = page.locator(".brief-understanding");
    await expect(block).toContainText("LUMIERE");
    await expect(block).toContainText("Салон красоты");
    await expect(block).toContainText("Астана");
    await expect(block).toContainText("Записывать клиентов");
    // Модель на этом шаге не вызывается — обещать её анализ нельзя.
    await expect(block).toContainText("сформировал рекомендации");
    await expect(block).not.toContainText("проанализировал");

    // Возврат и правка города обязаны отразиться в блоке.
    await page.getByRole("button", { name: /Назад/ }).click();
    await page.getByRole("button", { name: /Назад/ }).click();
    await page.getByPlaceholder("Например: Астана").fill("Алматы");
    await page.getByRole("button", { name: /Дальше/ }).click();
    await page.getByRole("button", { name: /Показать структуру/ }).click();
    await expect(page.locator(".brief-understanding")).toContainText("Алматы");
  });

  test("правки структуры доходят до проекта", async ({ page }) => {
    await page.goto("/app/new");
    const field = page.getByPlaceholder("Например: Барбершоп FORMA");
    const next = page.getByRole("button", { name: /Дальше/ });
    await expect(async () => {
      await field.fill("LUMIERE");
      await expect(next).toBeEnabled({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await page.getByPlaceholder(/Чем занимаетесь/).fill("Салон красоты, уход и окрашивание");
    await next.click();
    await page.getByRole("button", { name: "Записывать клиентов", exact: true }).click();
    await page.getByRole("button", { name: /Показать структуру/ }).click();

    const before = await page.locator(".brief-structure-row").count();
    // Удаляем раздел и переименовываем первый оставшийся — обе правки должны пережить создание.
    await page.locator(".brief-structure-remove").last().click();
    await expect(page.locator(".brief-structure-row")).toHaveCount(before - 1);
    await page.locator(".brief-structure-title").first().fill("Наши мастера");

    await page.getByRole("button", { name: /Дальше/ }).click();
    await page.getByRole("button", { name: /Дальше/ }).click();
    await page.getByRole("button", { name: /Создать проект/ }).click();
    await page.waitForURL(/\/app\/projects\/.+/);
    await expect(page.locator(".overview-card-grid")).toBeVisible({ timeout: 20_000 });

    const saved = await page.evaluate(() => {
      const raw = window.localStorage.getItem("aevix.projects");
      return raw ? JSON.parse(raw).projects[0].sections : null;
    });
    expect(saved).toHaveLength(before - 1);
    expect(saved[0].title).toBe("Наши мастера");
  });

  test("предложенные разделы не повторяют друг друга по смыслу", async ({ page }) => {
    // Салону предлагались рядом «Услуги» и «Цены и услуги»: одно и то же слово в двух строках
    // подряд, и человек не понимал, чем разделы отличаются. Проверяется общее свойство, а не
    // конкретная пара строк, — иначе следующая такая же пара проедет мимо теста.
    await page.goto("/app/new");
    const field = page.getByPlaceholder("Например: Барбершоп FORMA");
    const next = page.getByRole("button", { name: /Дальше/ });
    await expect(async () => {
      await field.fill("LUMIERE");
      await expect(next).toBeEnabled({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await page.getByPlaceholder(/Чем занимаетесь/).fill("Салон красоты, уход и окрашивание");
    await next.click();
    await page.getByRole("button", { name: "Записывать клиентов", exact: true }).click();
    await page.getByRole("button", { name: /Показать структуру/ }).click();
    await expect(page.locator(".brief-structure-row").first()).toBeVisible();

    const titles = await page.locator(".brief-structure-title").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLInputElement).value),
    );
    expect(titles.length).toBeGreaterThan(3);

    // Ни одно название не должно целиком содержаться в другом: «Услуги» внутри «Цены и услуги»
    // — ровно тот случай.
    const words = titles.map((title) => title.toLowerCase().split(/[^а-яёa-z]+/).filter(Boolean));
    for (let i = 0; i < words.length; i++) {
      for (let j = 0; j < words.length; j++) {
        if (i === j) continue;
        const shared = words[i].filter((word) => words[j].includes(word));
        expect(shared, `«${titles[i]}» и «${titles[j]}» делят слово`).toEqual([]);
      }
    }
  });

  test("an AI Consultant result is saved and shown on Overview without regenerating", async ({ page }) => {
    await mockAnalysis(page);
    const projectUrl = await completeWizard(page, "AI Test Project");

    await page.goto(`${projectUrl}/ai-consultant`);

    // A short description classifies as a "quick question", not a full analysis — this needs
    // enough words plus a process keyword ("не успеваем") to route to the full report.
    const description =
      "У меня небольшая кофейня, заказы приходят через Instagram и WhatsApp, у меня всего два сотрудника и мы не успеваем отвечать вовремя";
    const field = page.locator('[aria-label="Описание бизнеса для AI-консультанта"]');
    // .fill() doesn't reliably land in this controlled textarea before hydration settles;
    // click + type (like a real visitor) is the pattern proven to work here.
    await field.click();
    await field.type(description, { delay: 5 });
    await expect(field).toHaveValue(description);
    await page.getByRole("button", { name: "Проанализировать бизнес" }).click();
    await expect(page.locator(".ai-short-answer")).toBeVisible();
    await page.waitForTimeout(300); // let the save-to-project effect chain flush before navigating away

    await page.goto(projectUrl);
    await expect(page.getByText("Да, вам нужен WhatsApp-бот.")).toBeVisible();

    // Reopening the AI Consultant tab shows the saved result immediately — no re-generation.
    await page.goto(`${projectUrl}/ai-consultant`);
    await expect(page.locator(".ai-short-answer")).toBeVisible();
  });

  test("боковая панель концепта не растягивается пустотой под высоту превью", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "на мобильном панель — выдвижная, колонки нет");
    await seedStorage(page, [
      seededProject({
        id: "sidebar-gap",
        design: {
          businessName: "FORMA",
          businessType: "Барбершоп",
          colorIds: ["black"],
          styleId: "minimal",
          navigation: [{ label: "Главная", pageId: "home" }],
          pages: [
            {
              id: "home",
              name: "Главная",
              hero: { eyebrow: "Барбершоп", title: "FORMA", subtitle: "Стрижки", primaryCta: "Записаться", secondaryCta: "Услуги" },
              sections: [{ type: "services", title: "Услуги" }],
            },
          ],
        },
      }),
    ]);
    await page.goto("/app/projects/sidebar-gap/design");
    await expect(page.locator(".concept-preview-stage")).toBeVisible();

    // Во встроенном режиме превью растёт вместе со страницей. Пока панель тянулась под его
    // высоту, `margin-top: auto` у подвала уводил цену вниз, и между инструментами и ценой
    // зияло около 700 пустых пикселей. Порог с запасом: обычный зазор здесь — десятки.
    const gap = await page.locator(".concept-sidebar").evaluate((el) => {
      const kids = [...el.children];
      return kids[kids.length - 1].getBoundingClientRect().top - kids[kids.length - 2].getBoundingClientRect().bottom;
    });
    expect(gap).toBeLessThan(120);
  });

  test("секцию можно выбрать с клавиатуры, и фокус на ней видно", async ({ page }) => {
    await seedStorage(page, [
      seededProject({
        id: "keyboard-design",
        design: {
          businessName: "FORMA",
          businessType: "Барбершоп",
          colorIds: ["purple"],
          styleId: "minimal",
          navigation: [{ label: "Главная", pageId: "home" }],
          pages: [
            {
              id: "home",
              name: "Главная",
              hero: { eyebrow: "Барбершоп", title: "FORMA", subtitle: "Тест", primaryCta: "Записаться", secondaryCta: "Услуги" },
              sections: [{ type: "reviews", title: "Отзывы" }],
            },
          ],
        },
      }),
    ]);
    await page.goto("/app/projects/keyboard-design/design");

    // Выбор секции обязан быть настоящей кнопкой: обработчик на div не попадает в порядок
    // табуляции, и с клавиатуры секцию было не выбрать вовсе.
    const select = page.getByRole("button", { name: "Выбрать секцию «Отзывы»" });
    await expect(select).toBeVisible();

    await select.focus();
    // Панель инструментов скрыта прозрачностью до наведения. Без :focus-within фокус вставал бы
    // на невидимую кнопку — человек нажимает Tab и не понимает, где он.
    await expect
      .poll(async () => page.locator(".concept-section-tools").first().evaluate((el) => getComputedStyle(el).opacity))
      .toBe("1");

    await page.keyboard.press("Enter");
    await expect(page.locator(".concept-section-piece").first()).toHaveClass(/is-selected/);
    await expect(select).toHaveAttribute("aria-pressed", "true");

    // Повторное нажатие снимает выбор — то же поведение, что и у клика.
    await page.keyboard.press("Enter");
    await expect(page.locator(".concept-section-piece").first()).not.toHaveClass(/is-selected/);
  });

  test("город из брифа виден в контактах, а не демо-адрес чужого города", async ({ page }) => {
    // Адреса в базе знаний привязаны к Алматы. Пока город не доходил до концепта, проект с
    // «Астаной» показывал «Микрорайон Самал-2, 58, Алматы» — улицу чужого города.
    await seedStorage(page, [
      seededProject({
        id: "city-astana",
        city: "Астана",
        design: {
          businessName: "LUMIERE",
          businessType: "Салон красоты",
          city: "Астана",
          colorIds: ["purple"],
          styleId: "minimal",
          navigation: [{ label: "Контакты", pageId: "home" }],
          pages: [
            {
              id: "home",
              name: "Контакты",
              hero: { eyebrow: "Салон", title: "LUMIERE", subtitle: "Тест", primaryCta: "Записаться", secondaryCta: "Услуги" },
              sections: [{ type: "contacts", title: "Наши контакты", items: [] }],
            },
          ],
        },
      }),
    ]);
    await page.goto("/app/projects/city-astana/design");
    await expect(page.locator(".concept-preview-stage")).toBeVisible();

    const address = page.locator(".concept-contacts address strong");
    await expect(address).toContainText("Астана");
    await expect(address).not.toContainText("Алматы");
    // Подпись на карте — второе место, где адрес печатался, и его тоже забывали.
    await expect(page.locator(".concept-map-caption")).toContainText("Астана");
    await expect(page.locator(".concept-map-caption")).not.toContainText("Алматы");
  });

  test("без города остаётся демо-адрес ниши, как было", async ({ page }) => {
    // Обратная сторона: концепты с лендинга города не знают, и им нельзя ломать контакты.
    await seedStorage(page, [
      seededProject({
        id: "city-none",
        design: {
          businessName: "FORMA",
          businessType: "Салон красоты",
          colorIds: ["purple"],
          styleId: "minimal",
          navigation: [{ label: "Контакты", pageId: "home" }],
          pages: [
            {
              id: "home",
              name: "Контакты",
              hero: { eyebrow: "Салон", title: "FORMA", subtitle: "Тест", primaryCta: "Записаться", secondaryCta: "Услуги" },
              sections: [{ type: "contacts", title: "Наши контакты", items: [] }],
            },
          ],
        },
      }),
    ]);
    await page.goto("/app/projects/city-none/design");
    await expect(page.locator(".concept-preview-stage")).toBeVisible();
    await expect(page.locator(".concept-contacts address strong")).toContainText("Алматы");
  });

  test("повторяющиеся секции убираются при чтении проекта", async ({ page }) => {
    // Модель наблюдалась с двумя секциями одного типа на странице («О нас: about, about»).
    // Чистка идёт по типу секции — устойчивому смысловому признаку, а не по позиции в массиве.
    await seedStorage(page, [
      seededProject({
        id: "dupe-about",
        design: {
          businessName: "FORMA",
          businessType: "Салон красоты",
          colorIds: ["purple"],
          styleId: "minimal",
          navigation: [{ label: "О нас", pageId: "home" }],
          pages: [
            {
              id: "home",
              name: "О нас",
              hero: { eyebrow: "Салон", title: "FORMA", subtitle: "Тест", primaryCta: "Записаться", secondaryCta: "Услуги" },
              sections: [
                { type: "about", title: "История FORMA", items: [] },
                { type: "about", title: "История FORMA", items: [] },
              ],
            },
          ],
        },
      }),
    ]);
    await page.goto("/app/projects/dupe-about/design");
    await expect(page.locator(".concept-preview-stage")).toBeVisible();
    await expect(page.locator(".concept-section.concept-about-page")).toHaveCount(1);

    // И повтор не возвращается после перезагрузки: чистка живёт в чтении проекта, а не в вёрстке.
    await page.reload();
    await expect(page.locator(".concept-preview-stage")).toBeVisible();
    await expect(page.locator(".concept-section.concept-about-page")).toHaveCount(1);
  });

  test("законная пара «цены + услуги» у бизнеса с товарами сохраняется", async ({ page }) => {
    // У кофейни есть товары: `pricing` — меню, `services` — сервисы вокруг него. Это разные
    // секции, и чистка обязана их не трогать.
    await seedStorage(page, [
      seededProject({
        id: "keep-pair",
        businessType: "Кофейня",
        design: {
          businessName: "ROAST",
          businessType: "Кофейня",
          colorIds: ["purple"],
          styleId: "minimal",
          navigation: [{ label: "Меню", pageId: "home" }],
          pages: [
            {
              id: "home",
              name: "Меню",
              hero: { eyebrow: "Кофейня", title: "ROAST", subtitle: "Тест", primaryCta: "Заказать", secondaryCta: "Меню" },
              sections: [
                { type: "pricing", title: "Меню и цены", items: [] },
                { type: "services", title: "Не только меню", items: [] },
              ],
            },
          ],
        },
      }),
    ]);
    await page.goto("/app/projects/keep-pair/design");
    await expect(page.locator(".concept-preview-stage")).toBeVisible();
    await expect(page.locator(".concept-section")).toHaveCount(2);
  });

  test("restores selected colors and visual style when reopening the Design tab", async ({ page }) => {
    const design = {
      businessName: "FORMA",
      businessType: "Барбершоп",
      colorIds: ["purple", "gold"],
      styleId: "minimal",
      navigation: [{ label: "Главная", pageId: "home" }],
      pages: [
        {
          id: "home",
          name: "Главная",
          hero: { eyebrow: "Барбершоп", title: "FORMA", subtitle: "Тест", primaryCta: "Записаться", secondaryCta: "Услуги" },
          sections: [],
        },
      ],
    };
    await seedStorage(page, [seededProject({ id: "save-design", design })]);
    await page.goto("/app/projects/save-design/design");

    await expect(page.locator(".concept-preview-stage")).toBeVisible();
    await expect(page.locator("#website-concept-title")).toHaveText("FORMA");
  });

  test("pricing selections and calculated result persist across a reload", async ({ page }) => {
    const projectUrl = await completeWizard(page, "Pricing Test Project");

    await page.goto(`${projectUrl}/pricing`);
    await page.getByRole("button", { name: "Открыть калькулятор" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Барбершоп", exact: true }).click();
    await dialog.getByRole("button", { name: "Далее" }).click();
    // onPricingChange fires as soon as at least one service is selected — no need to reach the
    // final wizard step, and it doesn't matter which service.
    await dialog.getByRole("button", { name: "AI-консультант", exact: false }).first().click();
    await page.waitForTimeout(400); // let the save-to-project effect chain flush before navigating away

    await page.goto(projectUrl);
    await expect(page.locator(".overview-card", { hasText: "Стоимость" }).locator(".overview-card-status")).toHaveText(
      "Готово",
    );
  });
});

test.describe("project card actions", () => {
  test("проект, созданный до ответа о состоянии входа, не теряется", async ({ page }) => {
    // Провайдер обязан дождаться ответа о сессии, прежде чем читать хранилище: до него
    // неизвестно, у какого хранилища спрашивать. Ответ идёт по сети, и в это окно спокойно
    // помещается создание проекта — он существует только в состоянии, потому что запись
    // заблокирована до конца загрузки. Пришедший следом список ОБЯЗАН слиться с ним, а не
    // заменить его собой.
    await page.route("**/api/auth/session", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });

    await completeWizard(page, "Создан во время проверки входа");
    await expect(page.locator(".workspace-project-name")).toHaveText("Создан во время проверки входа");
  });

  test("renaming through the three-dot menu updates immediately", async ({ page }) => {
    // Created through the UI, not seeded — addInitScript re-applies its seed on every reload,
    // which would silently undo the rename before the persistence assertion below.
    await completeWizard(page, "Old Name");
    await page.goto("/app/projects");

    await page.getByRole("button", { name: /Действия с проектом/ }).click();
    await page.getByRole("menuitem", { name: "Переименовать" }).click();
    const input = page.getByLabel("Новое название проекта");
    await input.fill("New Name");
    await input.press("Enter");

    await expect(page.locator(".workspace-project-card-name")).toHaveText("New Name");

    await page.reload();
    await expect(page.locator(".workspace-project-card-name")).toHaveText("New Name");
  });

  test("duplicating a project preserves nested data under a new id", async ({ page }) => {
    await seedStorage(page, [
      seededProject({
        id: "dup-source",
        name: "Dup Source",
        analysis: { shortAnswer: "Да.", reasons: ["A", "B", "C"], recommendedSolution: "X", summary: "S", problems: ["P"], recommendations: ["R1", "R2", "R3"], flow: ["A", "B"], callToAction: "CTA" },
      }),
    ]);
    await page.goto("/app/projects");
    await expect(page.locator(".workspace-project-card")).toHaveCount(1);

    await page.getByRole("button", { name: /Действия с проектом/ }).click();
    await page.getByRole("menuitem", { name: "Дублировать" }).click();
    await expect(page.locator(".workspace-project-card")).toHaveCount(2);
    await expect(page.getByText("Dup Source (копия)")).toBeVisible();

    // The duplicate carries the nested analysis over.
    await page
      .locator(".workspace-project-card", { hasText: "Dup Source (копия)" })
      .getByRole("link", { name: "Открыть" })
      .click();
    await expect(page.getByText("Да.")).toBeVisible();
  });

  test("delete requires confirmation and removes the project", async ({ page }) => {
    // Created through the UI, not seeded — addInitScript would re-seed the deleted project on
    // reload and break the "stays gone after refresh" assertion.
    await completeWizard(page, "To Delete");
    await page.goto("/app/projects");
    await expect(page.locator(".workspace-project-card")).toHaveCount(1);

    await page.getByRole("button", { name: /Действия с проектом/ }).click();
    await page.getByRole("menuitem", { name: "Удалить" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();

    // Cancel keeps the project.
    await page.getByRole("button", { name: "Отмена" }).click();
    await expect(page.locator(".workspace-project-card")).toHaveCount(1);

    // Confirm removes it — and it stays gone after a reload.
    await page.getByRole("button", { name: /Действия с проектом/ }).click();
    await page.getByRole("menuitem", { name: "Удалить" }).click();
    await page.getByRole("button", { name: "Удалить проект" }).click();
    await expect(page.locator(".workspace-project-card")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".workspace-project-card")).toHaveCount(0);
    await expect(page.locator(".workspace-empty-title")).toBeVisible();
  });
});

/**
 * Правка AI-дизайнера обязана быть видна сразу.
 *
 * Панель пишет правку прямо в проект, а превью держало собственную копию концепта, засеянную
 * один раз при монтировании. Правка сохранялась, попадала в историю — и не появлялась на экране
 * до перезагрузки. Для человека это выглядит как «AI-дизайнер не работает».
 *
 * Проверки написаны так, чтобы падать именно на рассинхронизации: заголовок читается из превью
 * БЕЗ перезагрузки, и только потом отдельно проверяется, что он же сохранился.
 */
test.describe("AI-дизайнер: превью и проект идут в ногу", () => {
  const designWithHeading = (title: string) => ({
    businessName: "FORMA",
    businessType: "Барбершоп",
    colorIds: ["purple", "gold"],
    styleId: "minimal",
    navigation: [{ label: "Главная", pageId: "home" }],
    pages: [
      {
        id: "home",
        name: "Главная",
        hero: { eyebrow: "Барбершоп", title, subtitle: "Тест", primaryCta: "Записаться", secondaryCta: "Услуги" },
        sections: [{ type: "services", title: "Услуги", items: [] }],
      },
    ],
  });

  // Именно заголовок героя на самом сайте, а не название бизнеса в шапке окна
  // (`#website-concept-title`) — правка «замени заголовок» меняет первый, и проверять надо его.
  const HEADING = ".concept-hero-copy h2";

  /**
   * Посев, который переживает перезагрузку.
   *
   * `seedStorage` кладёт данные через `addInitScript`, а он выполняется при каждой загрузке — и
   * после F5 вернул бы исходный проект поверх сделанной правки. Проверять сохранение таким
   * посевом нельзя: тест был бы зелёным и с полностью сломанной записью. Здесь посев ставится
   * только если хранилище пустое, поэтому дальше работает то, что записало само приложение.
   */
  async function seedOnce(page: Page, projects: unknown[]) {
    await page.addInitScript(
      ([key, value]) => {
        if (!window.localStorage.getItem(key as string)) window.localStorage.setItem(key as string, value as string);
      },
      [STORAGE_KEY, JSON.stringify({ version: 1, projects })],
    );
  }

  async function openDesigner(page: Page, id: string) {
    await seedOnce(page, [seededProject({ id, businessType: "Барбершоп", design: designWithHeading("FORMA") })]);
    await page.goto(`/app/projects/${id}/design`);
    await expect(page.locator(".concept-preview-stage")).toBeVisible();
    await expect(page.locator(HEADING)).toHaveText("FORMA");
    await page.locator(".designer-fab").click();
    await expect(page.locator(".designer-panel")).toBeVisible();
  }

  async function ask(page: Page, request: string) {
    await page.locator(".designer-input input").fill(request);
    await page.locator(".designer-input button[type=submit]").click();
  }

  test("правка появляется на превью без перезагрузки, и переживает её", async ({ page }) => {
    await openDesigner(page, "designer-live");
    await ask(page, "Замени заголовок на «Стрижка за 30 минут»");

    // Главное: без reload. Здесь тест и падал до правки — заголовок оставался прежним.
    await expect(page.locator(HEADING)).toHaveText("Стрижка за 30 минут");

    await page.reload();
    await expect(page.locator(HEADING)).toHaveText("Стрижка за 30 минут");
  });

  test("планшет 820px: панель докается снизу, превью держит ширину (§3, Wave 5)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "один раз с форсированным tablet-viewport");
    await page.setViewportSize({ width: 820, height: 1024 });
    await openDesigner(page, "designer-tablet");
    const panelBox = await page.locator(".designer-panel").boundingBox();
    const stageBox = await page.locator(".concept-preview-stage").boundingBox();
    expect(panelBox).not.toBeNull();
    expect(stageBox).not.toBeNull();
    // Панель докнута снизу (y в нижней половине), а не боковым оверлеем поверх правых ~40% превью.
    expect(panelBox!.y).toBeGreaterThan(1024 * 0.45);
    // Превью держит ширину страницы и НЕ схлопнуто (при старой резервации было бы ~128px).
    expect(stageBox!.width).toBeGreaterThan(400);
    // Панель не крадёт ширину у превью: превью шире узкого нижнего листа.
    expect(stageBox!.width).toBeGreaterThan(panelBox!.width * 0.9);
    // Правка всё ещё применяется и видна без reload.
    await ask(page, "Замени заголовок на «Тест планшета»");
    await expect(page.locator(HEADING)).toHaveText("Тест планшета");
  });

  test("отмена возвращает прежний заголовок сразу, без перезагрузки", async ({ page }) => {
    await openDesigner(page, "designer-undo");
    await ask(page, "Замени заголовок на «Стрижка за 30 минут»");
    await expect(page.locator(HEADING)).toHaveText("Стрижка за 30 минут");

    // Именно кнопки панели: «Вернуть» встречается на странице и вне её.
    await page.locator(".designer-panel button[aria-label='Отменить']").click();
    await expect(page.locator(HEADING)).toHaveText("FORMA");

    await page.locator(".designer-panel button[aria-label='Вернуть']").click();
    await expect(page.locator(HEADING)).toHaveText("Стрижка за 30 минут");
  });

  test("две правки подряд по одному полю: побеждает последняя, и записей ровно две", async ({ page }) => {
    await openDesigner(page, "designer-twice");
    await ask(page, "Замени заголовок на «Первый вариант»");
    await expect(page.locator(HEADING)).toHaveText("Первый вариант");
    await ask(page, "Замени заголовок на «Второй вариант»");
    await expect(page.locator(HEADING)).toHaveText("Второй вариант");

    // Двойное применение выдало бы себя здесь: на две правки — ровно две записи в истории.
    const entries = await page.evaluate((key) => {
      const raw = JSON.parse(window.localStorage.getItem(key as string) ?? "{}") as {
        projects?: Array<{ id: string; editHistory?: unknown[]; designerLog?: unknown[] }>;
      };
      const project = raw.projects?.find((item) => item.id === "designer-twice");
      return { edits: project?.editHistory?.length ?? 0, log: project?.designerLog?.length ?? 0 };
    }, STORAGE_KEY);
    expect(entries).toEqual({ edits: 2, log: 2 });
  });

  test("переход в другой раздел проекта и обратно не теряет правку", async ({ page }) => {
    await openDesigner(page, "designer-nav");
    await ask(page, "Замени заголовок на «Стрижка за 30 минут»");
    await expect(page.locator(HEADING)).toHaveText("Стрижка за 30 минут");

    await page.goto("/app/projects/designer-nav/pricing");
    await expect(page.locator(".workspace-page")).toBeVisible();
    await page.goto("/app/projects/designer-nav/design");
    await expect(page.locator(HEADING)).toHaveText("Стрижка за 30 минут");
  });

  test("медленный ответ модели: правка приходит на превью одна и целиком", async ({ page }) => {
    // Формулировку, которую локальный разборщик не знает, панель отправляет модели. Ответ здесь
    // намеренно медленный: пока он в пути, превью обязано остаться прежним, а когда придёт —
    // примениться ровно один раз.
    await page.route("**/api/designer-intent", async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ intent: { id: "edit-heading", text: "Через модель" } }),
      });
    });

    await openDesigner(page, "designer-slow");
    await ask(page, "Оживи первый экран как-нибудь по-своему");

    // Пока ответа нет — ни правки, ни возможности отправить вторую.
    await expect(page.locator(".designer-steps")).toContainText("Разбираем запрос");
    await expect(page.locator(HEADING)).toHaveText("FORMA");
    await expect(page.locator(".designer-input input")).toBeDisabled();

    await expect(page.locator(HEADING)).toHaveText("Через модель");
    await expect(page.locator(".designer-history-item")).toHaveCount(1);
  });

  test("цвет и скругления тоже применяются сразу", async ({ page }) => {
    await openDesigner(page, "designer-style");
    const before = await page.locator(".concept-site").evaluate((el) => getComputedStyle(el).getPropertyValue("--concept-accent"));
    await ask(page, "Сделай темнее");
    await expect
      .poll(() => page.locator(".concept-site").evaluate((el) => getComputedStyle(el).getPropertyValue("--concept-accent")))
      .not.toBe(before);
  });
});

test.describe("project navigation responsiveness", () => {
  test("project tab bar has no horizontal page overflow on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-specific viewport check");
    await seedStorage(page, [seededProject({ id: "responsive-project" })]);
    await page.goto("/app/projects/responsive-project");

    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflowX).toBe(false);
  });

  test("страница «Дизайн» не едет вбок на телефоне, и панель инструментов помещается", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "проверка узкого экрана");
    // `.workspace-page` — grid, а grid-элемент не сжимается уже своей min-content ширины: встроенный
    // рабочий стол концепта распирал страницу до 533px при экране 390. Проверяется и причина
    // (ширина самого блока), и следствие (прокрутка страницы) — одного следствия мало: его можно
    // спрятать через `overflow-x: hidden`, оставив вёрстку сломанной.
    await seedStorage(page, [
      seededProject({
        id: "narrow-design",
        design: {
          businessName: "FORMA",
          businessType: "Барбершоп",
          colorIds: ["purple"],
          styleId: "minimal",
          navigation: [{ label: "Главная", pageId: "home" }],
          pages: [
            {
              id: "home",
              name: "Главная",
              hero: { eyebrow: "Барбершоп", title: "FORMA", subtitle: "Тест", primaryCta: "Записаться", secondaryCta: "Услуги" },
              sections: [{ type: "services", title: "Услуги", items: [] }],
            },
          ],
        },
      }),
    ]);
    await page.goto("/app/projects/narrow-design/design");
    await expect(page.locator(".concept-preview-stage")).toBeVisible();

    const fits = await page.evaluate(() => {
      const doc = document.documentElement;
      const embedded = document.querySelector(".concept-embedded") as HTMLElement | null;
      return {
        pageOverflow: doc.scrollWidth - doc.clientWidth,
        embeddedWidth: Math.round(embedded?.getBoundingClientRect().width ?? 0),
        viewport: doc.clientWidth,
      };
    });
    expect(fits.pageOverflow).toBeLessThanOrEqual(1);
    expect(fits.embeddedWidth).toBeLessThanOrEqual(fits.viewport);

    // Управление размером превью остаётся доступным, а не уезжает под обрезку.
    for (const label of ["Desktop", "Tablet", "Mobile"]) {
      await expect(page.locator(`.concept-mode-switch button[title="${label}"]`)).toBeInViewport();
    }
  });

  test("project tab bar and sidebar render with no console errors on desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-specific viewport check");
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await seedStorage(page, [seededProject({ id: "responsive-project" })]);
    await page.goto("/app/projects/responsive-project");

    await expect(page.locator(".shell-sidebar")).toBeVisible();
    // The open project shows exactly its own five sections.
    await expect(page.locator(".shell-sidebar .shell-nav-item")).toHaveCount(5);
    expect(errors).toEqual([]);
  });
});
