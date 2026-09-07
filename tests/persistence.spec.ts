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

  test("медленное сохранение не перезаписывает более новое (порядок на сервере)", async ({ page }) => {
    /**
     * Отмена на клиенте не отзывает запрос, который сервер уже принял.
     *
     * Измерено на настоящем маршруте: два PUT подряд, где ранний тяжелее, — сервер шесть раз из
     * шести заканчивал РАННИМ, то есть на сервере оставалось устаревшее состояние. Клиент об
     * этом не узнавал: ответ он игнорировал как вытесненный и показывал «сохранено».
     *
     * Порядка на сервере нет и взяться ему неоткуда — он пишет то, что пришло. Значит второе
     * сохранение нельзя отправлять, пока не ответило первое. Здесь это и проверяется: первый PUT
     * держится, вторая правка приходит в это время, и сервер обязан закончить ПОСЛЕДНЕЙ.
     *
     * Фальшивый сервер записывает порядок КОММИТОВ, а не отправок: именно перестановка коммитов
     * и была дефектом.
     */
    const server = {
      projects: [{
        id: "p1", name: "Name A", businessType: "Барбершоп", businessDescription: "", city: "Астана",
        preferredStyleIds: [], preferredColorIds: [], goals: [], sections: [], wishes: "",
        generatedAt: 1, publishedAt: null, designerLog: [], editHistory: [], redoHistory: [],
        analysis: null, design: null, pricing: null, createdAt: 1, updatedAt: 1, favorite: false,
      }],
      commits: [] as string[],
      seen: 0,
    };
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "u1", email: "t@t.io" }, available: true }) }),
    );
    await page.route("**/api/projects", async (route) => {
      const req = route.request();
      if (req.method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ projects: server.projects }) });
      }
      if (req.method() === "PUT") {
        server.seen += 1;
        // Первый PUT — медленный. Ровно то окно, в которое раньше успевал уйти второй.
        if (server.seen === 1) await new Promise((r) => setTimeout(r, 1500));
        const body = JSON.parse(req.postData() || "{}");
        server.projects = body.projects;
        server.commits.push(body.projects[0]?.name ?? "?");
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: 1 }) });
      }
      return route.fallback();
    });

    await page.goto("/app/projects", { waitUntil: "networkidle" });
    await expect(page.locator(".workspace-project-card-name")).toHaveText("Name A");

    await rename(page, "Name B");
    // Ждём, пока первый PUT уйдёт и застрянет в задержке, и только потом правим второй раз.
    await expect.poll(() => server.seen, { timeout: 6000 }).toBeGreaterThan(0);
    await rename(page, "Name C");

    await expect(page.locator(".save-status[data-state='saved']")).toHaveCount(1, { timeout: 12000 });

    expect(
      server.commits[server.commits.length - 1],
      `порядок коммитов на сервере: ${server.commits.join(" → ")} — последним обязано быть последнее имя`,
    ).toBe("Name C");
    expect(server.projects[0].name).toBe("Name C");
  });
});
