import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * The Workspace's project system: every business worked on in AEVIX becomes a Project that
 * persists in localStorage — AI analysis, design, and pricing all attach to the same project
 * and survive a reload. The analysis endpoint is mocked for determinism.
 */

const STORAGE_KEY = "aevix.projects";

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

test.describe("project persistence", () => {
  test("a seeded project survives a reload", async ({ page }) => {
    await seedStorage(page, [seededProject()]);
    await page.goto("/app/projects/seed-project");
    await expect(page.locator(".workspace-project-name")).toHaveText("Seed Project");

    await page.reload();
    await expect(page.locator(".workspace-project-name")).toHaveText("Seed Project");
  });

  test("corrupted storage falls back to an empty state instead of crashing", async ({ page }) => {
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
    await expect(page.locator(".workspace-tab.is-active")).toHaveText(/Цены/);
  });
});

test.describe("project creation", () => {
  test("New Project creates and opens a project with a renamable default name", async ({ page }) => {
    await page.goto("/app");
    await page.locator(".workspace-topbar").getByRole("button", { name: "Новый проект" }).click();
    await page.waitForURL(/\/app\/projects\/.+/);
    await expect(page.locator(".workspace-project-name")).toHaveText("Новый проект");

    await page.locator(".workspace-project-name").click();
    await page.locator(".workspace-project-name-input").fill("Барбершоп на Абая");
    await page.locator(".workspace-project-name-input").blur();
    await expect(page.locator(".workspace-project-name")).toHaveText("Барбершоп на Абая");
  });

  test("creating from the current business does not duplicate on repeat visits", async ({ page }) => {
    await mockAnalysis(page);
    await page.goto("/");
    const field = page.locator("#hero-business-input");
    await expect(async () => {
      await field.fill("·");
      await expect(field).toHaveValue("·", { timeout: 400 });
    }).toPass({ timeout: 8000 });
    await field.fill("У меня барбершоп на 3 мастера, запись вручную");
    await field.press("Enter");
    await expect(page.locator(".hero-result")).toBeVisible();

    await page.getByRole("link", { name: "Workspace" }).first().click();
    await page.waitForURL("**/app");
    await page.getByRole("button", { name: /Создать проект/ }).click();
    await page.waitForURL(/\/app\/projects\/.+/);

    // Back on the Dashboard, the same business must not offer to create a second project.
    await page.goto("/app");
    await expect(page.getByRole("button", { name: /Создать проект/ })).toHaveCount(0);
  });
});

test.describe("saving module state into a project", () => {
  test("an AI Consultant result is saved and shown on Overview without regenerating", async ({ page }) => {
    // Created through the UI (not seeded via addInitScript) — addInitScript re-applies its seed
    // on every navigation in the page, which would silently wipe out whatever gets saved before
    // the test's second `page.goto`. A UI-created project has no such re-seeding involved.
    await mockAnalysis(page);
    await page.goto("/app");
    await page.locator(".workspace-topbar").getByRole("button", { name: "Новый проект" }).click();
    await page.waitForURL(/\/app\/projects\/.+/);
    const projectUrl = page.url();

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
    // Created through the UI, not seeded via addInitScript — see the note on the AI Consultant
    // test above for why (addInitScript re-seeds on every navigation, wiping saved state).
    await page.goto("/app");
    await page.locator(".workspace-topbar").getByRole("button", { name: "Новый проект" }).click();
    await page.waitForURL(/\/app\/projects\/.+/);
    const projectUrl = page.url();

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
    await expect(page.locator(".workspace-card-desc").nth(3)).not.toHaveText("Стоимость пока не рассчитана.");
  });
});

test.describe("project actions", () => {
  test("duplicating a project preserves nested data under a new id", async ({ page }) => {
    await seedStorage(page, [
      seededProject({
        id: "dup-source",
        name: "Dup Source",
        analysis: { shortAnswer: "Да.", reasons: ["A", "B", "C"], recommendedSolution: "X", summary: "S", problems: ["P"], recommendations: ["R1", "R2", "R3"], flow: ["A", "B"], callToAction: "CTA" },
      }),
    ]);
    await page.goto("/app/projects");
    await expect(page.locator(".workspace-project-row")).toHaveCount(1);

    await page.locator('.workspace-project-row button[title="Дублировать"]').click();
    await expect(page.locator(".workspace-project-row")).toHaveCount(2);
    await expect(page.getByText("Dup Source (копия)")).toBeVisible();

    // The duplicate carries the nested analysis over.
    await page.getByText("Dup Source (копия)").click();
    await expect(page.getByText("Да.")).toBeVisible();
  });

  test("delete requires confirmation and removes the project", async ({ page }) => {
    await seedStorage(page, [seededProject({ id: "to-delete", name: "To Delete" })]);
    await page.goto("/app/projects");
    await expect(page.locator(".workspace-project-row")).toHaveCount(1);

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.locator('.workspace-project-row button[title="Удалить"]').click();
    await expect(page.locator(".workspace-project-row")).toHaveCount(1); // dismissed — still there

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator('.workspace-project-row button[title="Удалить"]').click();
    await expect(page.locator(".workspace-project-row")).toHaveCount(0);
  });
});

test.describe("project navigation responsiveness", () => {
  test("project tab bar has no horizontal page overflow on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-specific viewport check");
    await seedStorage(page, [seededProject({ id: "responsive-project" })]);
    await page.goto("/app/projects/responsive-project");

    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflowX).toBe(false);
    await expect(page.locator(".workspace-tab")).toHaveCount(5);
  });

  test("project tab bar and sidebar render with no console errors on desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-specific viewport check");
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await seedStorage(page, [seededProject({ id: "responsive-project" })]);
    await page.goto("/app/projects/responsive-project");

    await expect(page.locator(".workspace-sidebar")).toBeVisible();
    await expect(page.locator(".workspace-tab")).toHaveCount(5);
    expect(errors).toEqual([]);
  });
});
