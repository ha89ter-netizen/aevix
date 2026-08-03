import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Тестовому процессу нужны DATABASE_URL и AUTH_SECRET: тесты аккаунтов заводят пользователей и
 * выпускают ссылки для входа напрямую, а не через письмо. Next.js читает .env.local сам, но
 * только для сервера — здесь это отдельный процесс.
 *
 * Как и `--env-file`, не перебивает уже заданные переменные окружения: экспортированное в
 * оболочке значение остаётся главнее файла.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Файла нет — тесты аккаунтов пропустят сами себя, остальные не заметят.
}

export default defineConfig({
  testDir: "./tests",
  forbidOnly: Boolean(process.env.CI),
  /**
   * One retry locally, two on CI.
   *
   * These specs drive real WebGL scenes, GSAP timelines and a shared `next dev` server that
   * compiles routes on demand, all through a single worker. Individually every test is
   * deterministic — the failures that appear in a full run land on a DIFFERENT test each time,
   * which is the signature of contention for machine resources rather than a bug in any one of
   * them. Four such tests were fixed at the mechanism level first (dropped keypresses, a click
   * target derived from the moving element, races against project generation); this covers the
   * residue.
   *
   * A retry does not hide anything: Playwright reports a test that needed one as "flaky", so a
   * genuinely broken test still fails twice and stays red.
   */
  retries: process.env.CI ? 2 : 1,
  // Serialised on purpose. These specs drive one shared `next dev` server, which compiles
  // routes on demand; parallel workers make the first request per worker stall long enough
  // to trip the timeout. The suite is small, so serial is both reliable and fast (~20s).
  workers: 1,
  timeout: 45_000,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
