import { test, expect } from "@playwright/test";
import { SITE } from "./support/routes";

/**
 * Публичные поверхности, появившиеся в production hardening pass: общий 404, правовые страницы,
 * их доступность из подвала и правовой контекст у формы заявки.
 */

const UNKNOWN = "/this-route-does-not-exist";

test.describe("общий 404", () => {
  test("неизвестный адрес отвечает 404 и объясняет это человеку", async ({ page }) => {
    const response = await page.goto(UNKNOWN);
    // Именно статус, а не только текст: страница, рисующая «не найдено» с кодом 200, для
    // поисковика остаётся нормальной страницей и попадает в индекс.
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("нет");
    // Заголовок вкладки тоже сообщает об ошибке — вкладка в истории не должна выглядеть обычной.
    expect(await page.title()).toContain("не найдена");
  });

  test("есть путь домой и на сайт", async ({ page }) => {
    await page.goto(UNKNOWN);
    const home = page.getByRole("link", { name: "На главную" });
    await expect(home).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Возможности и цены" })).toHaveAttribute("href", SITE);

    await home.click();
    await expect(page).toHaveURL(new RegExp(`${page.url().split("/").slice(0, 3).join("/")}/?$`));
  });

  test("выход со страницы доступен с клавиатуры", async ({ page }) => {
    await page.goto(UNKNOWN);
    const home = page.getByRole("link", { name: "На главную" });
    // Фокусируем ссылку и уходим по Enter — обычным способом, которым по ссылкам ходят без мыши.
    await home.focus();
    await expect(home).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL(new RegExp(UNKNOWN));
  });

  test("не раскрывает приватное и не притворяется Workspace", async ({ page }) => {
    await page.goto(UNKNOWN);
    const body = (await page.locator("body").innerText()).toLowerCase();
    // Никаких имён проектов, списков и намёков на чужие данные: страница не знает, существует
    // ли что-то по этому адресу, и узнавать не должна.
    expect(body).not.toContain("проект не найден");
    expect(body).not.toContain("список проектов");
  });
});

test.describe("правовые страницы", () => {
  for (const [route, heading] of [
    ["/privacy", "Политика конфиденциальности"],
    ["/terms", "Условия использования"],
  ] as const) {
    test(`${route} открывается по прямому адресу`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      // Дата обновления — обязательная часть документа: без неё непонятно, какую редакцию читают.
      await expect(page.getByText(/Обновлено:/)).toBeVisible();
    });
  }

  test("политика описывает то, что приложение действительно делает", async ({ page }) => {
    await page.goto("/privacy");
    const body = await page.locator(".legal-page-body").innerText();

    // Все поставщики, подтверждённые кодом, названы. Умолчать о любом из них — значит написать
    // политику, которой противоречит собственный репозиторий.
    for (const processor of ["Vercel", "Neon", "OpenAI", "Resend"]) {
      expect(body).toContain(processor);
    }
    // Аккаунт и проекты — не только форма заявки: они тоже хранятся, и об этом сказано.
    expect(body).toMatch(/аккаунт/i);
    expect(body).toMatch(/проект/i);
    // Абсолютных обещаний быть не должно: инфраструктурные поставщики есть, и «никому никогда
    // не передаём» было бы неправдой.
    expect(body).not.toMatch(/никогда не передаём|полная безопасность|абсолютн\w+ защит/i);
  });

  test("условия не выдают оценку за оферту и честны про демо", async ({ page }) => {
    await page.goto("/terms");
    const body = await page.locator(".legal-page-body").innerText();

    expect(body).toMatch(/оферт/i);
    expect(body).toMatch(/демо/i);

    /**
     * Каноническая политика сопровождения — 30 дней, и её границы названы явно.
     *
     * Проверяется наличие ОТКАЗА, а не отсутствие слова. Первая версия этого теста искала
     * «безлимит» как запрещённую подстроку и краснела на фразе «безлимитных изменений мы не
     * предлагаем» — то есть ровно на том честном отказе, ради которого писалась. Слово само по
     * себе ничего не обещает; обещает предложение.
     */
    expect(body).toContain("30 дней");
    expect(body).toMatch(/Круглосуточной поддержки и безлимитных изменений мы не предлагаем/);
    expect(body).toMatch(/Ни роста выручки/);
  });
});

test.describe("доступность правовых документов", () => {
  test("подвал ведёт на обе страницы, и ссылки работают", async ({ page }) => {
    await page.goto(SITE);
    const footer = page.locator("footer.premium-footer");

    const privacy = footer.getByRole("link", { name: "Конфиденциальность" });
    const terms = footer.getByRole("link", { name: "Условия" });
    await expect(privacy).toHaveAttribute("href", "/privacy");
    await expect(terms).toHaveAttribute("href", "/terms");

    await privacy.click();
    await expect(page).toHaveURL(/\/privacy$/);

    // Возврат браузером — то, чего модальное окно дать не могло: оно уводило со всей страницы.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${SITE}$`));
  });
});

test.describe("форма заявки", () => {
  test("рядом с кнопкой сказано, что будет с данными, и есть ссылка на политику", async ({ page }) => {
    await page.goto(SITE);
    const form = page.locator("form.lead-form");
    await form.scrollIntoViewIfNeeded();

    await expect(form.getByText(/Отправляя заявку/)).toBeVisible();
    await expect(form.getByRole("link", { name: /политике конфиденциальности/ })).toHaveAttribute(
      "href",
      "/privacy",
    );

    /**
     * Заранее отмеченного согласия на рассылку быть не должно.
     *
     * Рассылки у AEVIX не существует, и галочка про неё была бы согласием, которого человек не
     * давал. Проверяется отсутствие ЛЮБОГО отмеченного checkbox в форме, а не конкретного поля:
     * так тест поймает и тот, который назовут иначе.
     */
    expect(await form.locator('input[type="checkbox"]:checked').count()).toBe(0);
  });
});
