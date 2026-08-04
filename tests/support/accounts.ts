import type { Page } from "@playwright/test";
import { createLoginCode } from "../../src/lib/auth";
import { db } from "../../src/lib/db";

/**
 * Вспомогательное для тестов аккаунтов.
 *
 * Код берётся вызовом `createLoginCode` — той самой функции, которой пользуется маршрут, — а не
 * выковыривается из письма. Так тест проходит настоящий путь «код → проверка → сессия», минуя
 * ровно одно звено: доставку письма Resend'ом. Читать код из базы нельзя и не нужно: там лежит
 * его подпись, и это защита, а не помеха.
 */

/** Тесты работают против настоящей базы, поэтому без неё пропускают себя целиком. */
export const accountsAvailable = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);

let counter = 0;

/** Свой адрес на каждый тест: прогоны не должны видеть данные друг друга. */
export function uniqueEmail(): string {
  counter += 1;
  return `playwright-${Date.now()}-${counter}@aevix.test`;
}

/**
 * Проходит вход целиком и дожидается Workspace.
 *
 * Код отправляется тем же маршрутом, которым его отправляет форма, — из контекста страницы,
 * чтобы cookie сессии досталась именно этому браузеру. Ровно ради этого свойства ссылка из
 * письма и была заменена на код.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  const code = await createLoginCode(email);
  const response = await page.request.post("/api/auth/verify", { data: { email, code } });
  if (!response.ok()) throw new Error(`вход не удался: ${response.status()} ${await response.text()}`);
  await page.goto("/app/projects");
  await page.waitForURL(/\/app\/projects/);
}

/** Убирает за тестом: удаление пользователя каскадом уносит и его проекты. */
export async function deleteAccount(email: string): Promise<void> {
  const sql = db();
  await sql`delete from login_tokens where email = ${email}`;
  await sql`delete from users where email = ${email}`;
}

/** Полноценный проект: нормализация на сервере отбросит объект, в котором чего-то не хватает. */
export function makeProject(name: string, id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`) {
  const now = Date.now();
  return {
    id,
    name,
    businessType: "Барбершоп",
    businessDescription: "",
    city: "Алматы",
    preferredStyleIds: [],
    preferredColorIds: [],
    generatedAt: null,
    publishedAt: null,
    designerLog: [],
    editHistory: [],
    redoHistory: [],
    createdAt: now,
    updatedAt: now,
    analysis: null,
    design: null,
    pricing: null,
  };
}

/** Кладёт проект в браузер так же, как это сделало бы приложение без аккаунта. */
export async function seedLocalProject(page: Page, project: ReturnType<typeof makeProject>): Promise<void> {
  await page.evaluate((value) => {
    window.localStorage.setItem("aevix.projects", JSON.stringify({ version: 1, projects: [value] }));
  }, project);
}
