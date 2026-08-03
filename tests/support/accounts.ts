import type { Page } from "@playwright/test";
import { createLoginToken } from "../../src/lib/auth";
import { db } from "../../src/lib/db";

/**
 * Вспомогательное для тестов аккаунтов.
 *
 * Ссылка для входа берётся вызовом `createLoginToken` — той самой функции, которой пользуется
 * маршрут, — а не выковыривается из письма. Так тест проходит настоящий путь «токен → переход
 * по ссылке → сессия», минуя ровно одно звено: доставку письма Resend'ом. Читать токен из базы
 * нельзя и не нужно: там лежит его хеш, и это защита, а не помеха.
 */

/** Тесты работают против настоящей базы, поэтому без неё пропускают себя целиком. */
export const accountsAvailable = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);

let counter = 0;

/** Свой адрес на каждый тест: прогоны не должны видеть данные друг друга. */
export function uniqueEmail(): string {
  counter += 1;
  return `playwright-${Date.now()}-${counter}@aevix.test`;
}

/** Проходит вход целиком и дожидается Workspace. */
export async function signIn(page: Page, email: string): Promise<void> {
  const token = await createLoginToken(email);
  await page.goto(`/api/auth/callback?token=${encodeURIComponent(token)}`);
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
