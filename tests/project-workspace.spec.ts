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
 * Creates a project through the real /app/new form and returns its URL. The controlled name
 * input can swallow a .fill() that lands before hydration settles (React resets the DOM value
 * on its first render) — the submit button enables only once React state actually has the name,
 * so retry the fill until that happens.
 */
async function createProjectViaForm(page: Page, name: string) {
  await page.goto("/app/new");
  const field = page.getByPlaceholder("Например: Барбершоп FORMA");
  const submit = page.getByRole("button", { name: "Создать проект" });
  await expect(async () => {
    await field.fill(name);
    await expect(submit).toBeEnabled({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await submit.click();
  await page.waitForURL(/\/app\/projects\/.+/);
  // Generation runs on arrival; callers assume a settled project.
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
  test("the Create Project form creates, saves and opens the project", async ({ page }) => {
    await page.goto("/app/new");
    const field = page.getByPlaceholder("Например: Барбершоп FORMA");
    await expect(async () => {
      await field.fill("Барбершоп на Абая");
      await expect(page.getByRole("button", { name: "Создать проект" })).toBeEnabled({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await page.getByRole("button", { name: "Барбершоп", exact: true }).click();
    await page.getByPlaceholder("Например: Алматы").fill("Алматы");
    await page.getByRole("button", { name: "Минимализм", exact: true }).click();
    await page.getByRole("button", { name: "Чёрный", exact: true }).click();
    await page.getByRole("button", { name: "Золотой", exact: true }).click();
    await page.getByRole("button", { name: "Создать проект" }).click();

    await page.waitForURL(/\/app\/projects\/.+/);
    // Creating a project now starts generation, and the Overview shows the generation screen
    // until it finishes. Waiting for the finished layout first stops the assertions below from
    // racing that work with their default 5s budget.
    await expect(page.locator(".overview-card-grid")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".workspace-project-name")).toHaveText("Барбершоп на Абая");
    await expect(page.locator(".overview-facts")).toContainText("Барбершоп");
    await expect(page.locator(".overview-facts")).toContainText("Алматы");

    // Visible on the dashboard with the collected fields, via a FULL page load (not client-side
    // navigation) — proves the project was persisted, not just held in memory. Retried because
    // the form's router.push can still be settling when this goto starts.
    await expect(async () => {
      await page.goto("/app/projects");
    }).toPass({ timeout: 15_000 });
    const card = page.locator(".workspace-project-card");
    await expect(card).toHaveCount(1);
    await expect(card.locator(".workspace-project-card-name")).toHaveText("Барбершоп на Абая");
    await expect(card.locator(".workspace-project-card-type")).toContainText("Барбершоп · Алматы");
    // Creation now generates everything up front, so a brand-new project is already complete.
    await expect(card.locator(".workspace-status-badge")).toHaveText("Готов");
  });

  test("submit is disabled until a business name is entered", async ({ page }) => {
    await page.goto("/app/new");
    const submit = page.getByRole("button", { name: "Создать проект" });
    await expect(submit).toBeDisabled();
    await expect(async () => {
      await page.getByPlaceholder("Например: Барбершоп FORMA").fill("X");
      await expect(submit).toBeEnabled({ timeout: 500 });
    }).toPass({ timeout: 15_000 });
  });
});

test.describe("saving module state into a project", () => {
  test("an AI Consultant result is saved and shown on Overview without regenerating", async ({ page }) => {
    await mockAnalysis(page);
    const projectUrl = await createProjectViaForm(page, "AI Test Project");

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
    const projectUrl = await createProjectViaForm(page, "Pricing Test Project");

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

    await createProjectViaForm(page, "Создан во время проверки входа");
    await expect(page.locator(".workspace-project-name")).toHaveText("Создан во время проверки входа");
  });

  test("renaming through the three-dot menu updates immediately", async ({ page }) => {
    // Created through the UI, not seeded — addInitScript re-applies its seed on every reload,
    // which would silently undo the rename before the persistence assertion below.
    await createProjectViaForm(page, "Old Name");
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
    await createProjectViaForm(page, "To Delete");
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

test.describe("project navigation responsiveness", () => {
  test("project tab bar has no horizontal page overflow on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-specific viewport check");
    await seedStorage(page, [seededProject({ id: "responsive-project" })]);
    await page.goto("/app/projects/responsive-project");

    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflowX).toBe(false);
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
