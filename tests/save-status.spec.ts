import { test, expect, type Page } from "@playwright/test";

/**
 * Видимое состояние сохранения (этап 7, Wave 1, QA-3).
 *
 * Раньше неудачная запись на сервер проходила молча (`saveState="error"` нигде не рендерился).
 * Теперь: при сбое пользователь ВИДИТ ошибку, правка не исчезает, есть «Повторить», повтор шлёт
 * актуальное состояние, успех очищает ошибку. Все сохранения идут через один провайдер → один
 * индикатор (проект/дизайн/AI Designer). Здесь проверяем через переименование проекта.
 */

const seededProject = {
  id: "p-save", name: "Old Name", businessType: "Барбершоп", businessDescription: "", city: "Астана",
  preferredStyleIds: [], preferredColorIds: [], goals: [], sections: [], wishes: "",
  generatedAt: 1, publishedAt: null, designerLog: [], editHistory: [], redoHistory: [],
  analysis: null, design: null, pricing: null, createdAt: 1, updatedAt: 1, favorite: false,
};

async function signedInWithFailingSave(page: Page) {
  const state = { putFails: true, lastPutBody: null as unknown };
  // Вошедший пользователь → провайдер использует серверное хранилище.
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "u1", email: "t@t.io" }, available: true }) }),
  );
  await page.route("**/api/projects", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: [seededProject] }) });
    }
    if (req.method() === "PUT") {
      state.lastPutBody = JSON.parse(req.postData() || "{}");
      if (state.putFails) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: 1 }) });
    }
    return route.fallback();
  });
  return state;
}

async function rename(page: Page, to: string) {
  await page.getByRole("button", { name: /Действия с проектом/ }).first().click();
  await page.getByRole("menuitem", { name: "Переименовать" }).click();
  const input = page.getByLabel("Новое название проекта");
  await input.fill(to);
  await input.press("Enter");
}

test.describe("QA-3 · видимая ошибка сохранения", () => {
  test("failed save виден, правка остаётся, Retry есть и работает", async ({ page }) => {
    const state = await signedInWithFailingSave(page);
    await page.goto("/app/projects", { waitUntil: "networkidle" });
    await expect(page.locator(".workspace-project-card-name")).toHaveText("Old Name");

    await rename(page, "New Name");

    // 1) правка видна оптимистично
    await expect(page.locator(".workspace-project-card-name")).toHaveText("New Name");
    // 2) ошибка ВИДНА (не молчит)
    await expect(page.locator(".save-status[data-state='error']")).toBeVisible();
    await expect(page.getByText("Не удалось сохранить")).toBeVisible();
    // 3) правка не исчезла из-за ошибки
    await expect(page.locator(".workspace-project-card-name")).toHaveText("New Name");
    // 4) Retry существует и доступен с клавиатуры
    const retry = page.locator(".save-status-retry");
    await expect(retry).toBeVisible();
    await retry.focus();
    expect(await retry.evaluate((el) => el === document.activeElement)).toBe(true);

    // 5) ещё правка ДО повтора (сервер всё ещё падает) — её сохранение тоже приводит к ошибке.
    // Ждём именно ошибку, а не гонку с дебаунсом: только тогда флипаем сервер и жмём Retry.
    await rename(page, "Newest Name");
    await expect(page.locator(".workspace-project-card-name")).toHaveText("Newest Name");
    await expect(page.locator(".save-status[data-state='error']")).toBeVisible({ timeout: 5000 });

    // 6) сервер снова принимает → Retry → Saved, ошибка ушла. Состояние «saved» на мобильном
    // намеренно скрыто CSS (транзиентная реассюранс), поэтому проверяем достижение состояния
    // (present) + отсутствие ошибки, а не visibility.
    state.putFails = false;
    await page.locator(".save-status-retry").press("Enter");
    await expect(page.locator(".save-status[data-state='error']")).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator(".save-status[data-state='saved']")).toHaveCount(1);
    // Повтор отправил АКТУАЛЬНОЕ имя, а не то, что было в момент первого сбоя.
    const names = (state.lastPutBody as { projects?: Array<{ name: string }> })?.projects?.map((p) => p.name) ?? [];
    expect(names).toContain("Newest Name");
  });
});
