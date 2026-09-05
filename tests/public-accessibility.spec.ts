import { test, expect, type Page } from "@playwright/test";
import { ENTRY, SITE } from "./support/routes";

/**
 * Доступность публичного слоя: изображения и управляющие элементы (production hardening pass).
 *
 * Проверка идёт по ЖИВОЙ странице, а не по исходникам. Разница принципиальная: `alt` может
 * стоять в JSX компонента, который на публичной странице не рендерится вовсе, — и grep по
 * репозиторию был бы зелёным, ничего не проверив. Здесь спрашивается ровно то, что получит
 * человек со скринридером.
 *
 * Аудит этого прохода нашёл, что публичные страницы не содержат ни одного `<img>` и ни одного
 * `next/image`: фотографии живут в превью сгенерированного сайта, а оно — поверхность Workspace,
 * за проектом. Тест это не констатирует, а СТОРОЖИТ: появится картинка — она обязана прийти с
 * решением про `alt`, а не незаметно.
 */

const PUBLIC_ROUTES = [ENTRY, SITE, "/privacy", "/terms", "/this-route-does-not-exist"];

/** Доступное имя элемента — тем же способом, каким его собирает браузер для скринридера. */
const ACCESSIBLE_NAME = `(el) => {
  const byId = el.getAttribute("aria-labelledby");
  const name = el.getAttribute("aria-label")
    || (byId && document.getElementById(byId)?.textContent)
    || el.getAttribute("title")
    || el.textContent;
  return (name || "").replace(/\\s+/g, " ").trim();
}`;

async function auditImages(page: Page) {
  return page.evaluate(`(() => [...document.querySelectorAll("img")].map((el) => ({
    src: el.getAttribute("src") || "",
    alt: el.getAttribute("alt"),
    hasAlt: el.hasAttribute("alt"),
    decorative: el.getAttribute("aria-hidden") === "true" || Boolean(el.closest("[aria-hidden='true']")),
  })))()`) as Promise<Array<{ src: string; alt: string | null; hasAlt: boolean; decorative: boolean }>>;
}

async function auditControls(page: Page) {
  return page.evaluate(`(() => {
    const accessibleName = ${ACCESSIBLE_NAME};
    return [...document.querySelectorAll("button, a[href], [role=button]")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        // Невидимое скринридеру не проверяем: скрытое поле-ловушка ботов и оформительские слои
        // намеренно вынуты из дерева доступности.
        if (!box.width && !box.height) return false;
        return !el.closest("[aria-hidden='true']");
      })
      .filter((el) => !accessibleName(el))
      .map((el) => el.outerHTML.slice(0, 140));
  })()`) as Promise<string[]>;
}

for (const route of PUBLIC_ROUTES) {
  test(`${route} — у каждого изображения есть решение про alt`, async ({ page }) => {
    await page.goto(route);
    for (const image of await auditImages(page)) {
      // Атрибут обязан присутствовать. Его ОТСУТСТВИЕ — не то же самое, что `alt=""`: скринридер
      // читает вместо него имя файла, и человек слышит «photo-1503951914875».
      expect(image.hasAlt, `нет атрибута alt: ${image.src}`).toBe(true);

      if (image.alt) {
        // Осмысленный alt — не заглушка. Именно эти слова кажутся заполнением поля и не
        // сообщают ничего: элемент уже объявлен изображением, повторять это словом незачем.
        expect(image.alt.toLowerCase()).not.toMatch(
          /^(image|picture|photo|img|фото|картинка|изображение|aevix image)\.?$/,
        );
        expect(image.alt.trim().length).toBeGreaterThan(3);
      }
    }
  });

  test(`${route} — у каждого управляющего элемента есть доступное имя`, async ({ page }) => {
    await page.goto(route);
    // Кнопка со значком и без имени для скринридера — «кнопка», и только. Один раз это уже
    // сделало выбор недоступным с клавиатуры (см. панель инструментов секции в CLAUDE.md).
    expect(await auditControls(page)).toEqual([]);
  });

  test(`${route} — декоративная графика не засоряет дерево доступности`, async ({ page }) => {
    await page.goto(route);
    const exposed = await page.evaluate(`(() => [...document.querySelectorAll("svg")]
      .filter((el) => {
        if (el.getAttribute("aria-hidden") === "true") return false;
        if (el.closest("[aria-hidden='true']")) return false;
        // Знак, несущий смысл, объявляет его сам — подписью или заголовком внутри.
        if (el.getAttribute("aria-label") || el.querySelector("title")) return false;
        // Значок внутри названной кнопки или ссылки имя уже получил — от неё.
        return !el.closest("button, a[href], [role=button], [role=img], [aria-label]");
      })
      .map((el) => (el.getAttribute("class") || "<svg>").slice(0, 60)))()`);
    expect(exposed).toEqual([]);
  });
}
