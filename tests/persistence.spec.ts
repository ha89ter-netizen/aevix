import { test, expect, type Page } from "@playwright/test";

/**
 * Надёжность сохранения (этап 7, Wave 2).
 *
 * Закрывает подтверждённую флаки-потерю переименования (правка → мгновенный reload) и проверяет,
 * что при быстрых правках на сервере остаётся ПОСЛЕДНЕЕ состояние, а не устаревшее.
 */

async function rename(page: Page, to: string) {
  await page.getByRole("button", { name: /Действия с проектом/ }).first().click();
  await page.getByRole("menuitem", { name: "Переименовать" }).click();
  const input = page.getByLabel("Новое название проекта");
  await input.fill(to);
  await input.press("Enter");
}

// Локальную починку «rename → мгновенный reload → новое имя» стережёт уже существующий
// project-workspace › renaming (после Wave 2 детерминирован: локальный pagehide-flush пишет
// localStorage синхронно до reload). Здесь — серверный сценарий «последнее состояние побеждает».

test.describe("persistence · сервер: последнее состояние побеждает, без устаревшей перезаписи", () => {
  test("две быстрые правки → reload → остаётся ПОСЛЕДНЯЯ", async ({ page }) => {
    // Вошедший пользователь + серверное хранилище с состоянием: сервер хранит последний принятый PUT.
    const server = {
      projects: [{
        id: "p1", name: "Name A", businessType: "Барбершоп", businessDescription: "", city: "Астана",
        preferredStyleIds: [], preferredColorIds: [], goals: [], sections: [], wishes: "",
        generatedAt: 1, publishedAt: null, designerLog: [], editHistory: [], redoHistory: [],
        analysis: null, design: null, pricing: null, createdAt: 1, updatedAt: 1, favorite: false,
      }],
      putCount: 0,
    };
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "u1", email: "t@t.io" }, available: true }) }),
    );
    await page.route("**/api/projects", async (route) => {
      const req = route.request();
      if (req.method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: server.projects }) });
      if (req.method() === "PUT") {
        server.putCount += 1;
        const body = JSON.parse(req.postData() || "{}");
        server.projects = body.projects; // сервер принимает последнее
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: server.projects.length }) });
      }
      return route.fallback();
    });

    await page.goto("/app/projects", { waitUntil: "networkidle" });
    await expect(page.locator(".workspace-project-card-name")).toHaveText("Name A");

    await rename(page, "Name B");
    await rename(page, "Name C");
    // ждём, пока дебаунс отработает и сохранение подтвердится
    await expect(page.locator(".save-status[data-state='saved']")).toHaveCount(1, { timeout: 6000 });

    // Сервер хранит ПОСЛЕДНЕЕ имя, а не устаревшее.
    expect(server.projects[0].name).toBe("Name C");

    // reload читает с «сервера» — остаётся последнее.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".workspace-project-card-name")).toHaveText("Name C");
  });
});
