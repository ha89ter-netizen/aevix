import { test, expect } from "@playwright/test";
import { ENTRY, SITE } from "./support/routes";
import { OG_IMAGE, PUBLIC_CONTACT_EMAIL, SITE_ORIGIN, absoluteUrl } from "../src/lib/site";

/**
 * Публичная identity AEVIX: один боевой origin, осмысленные заголовки, карточка для мессенджеров
 * и закрытый от индексации Workspace (production hardening pass).
 *
 * Проверки идут по РАЗМЕТКЕ, которую отдаёт сервер, а не по объектам `metadata` из исходников:
 * между «мы это объявили» и «браузер это получил» стоит Next со своими правилами наследования,
 * и именно там пряталась настоящая ошибка — страница, объявившая свои title и description,
 * молча наследовала социальную карточку корня вместе с чужим og:url.
 */

const PRIVACY = "/privacy";
const TERMS = "/terms";

/** Публичные страницы, которым место в поиске, и то, чем они друг от друга отличаются. */
const INDEXABLE = [ENTRY, SITE, PRIVACY, TERMS];

async function metaOf(page: import("@playwright/test").Page, selector: string, attr = "content") {
  return page.locator(selector).first().getAttribute(attr);
}

test.describe("метаданные публичных страниц", () => {
  for (const route of INDEXABLE) {
    test(`${route} — заголовок, описание и канонический адрес на боевом домене`, async ({ page }) => {
      await page.goto(route);

      // Заголовок и описание есть и не пустые. Длину и точный текст не фиксируем: это
      // редакторское решение, и тест, требующий конкретной строки, ломался бы на правке слова.
      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title).toContain("AEVIX");

      const description = await metaOf(page, 'meta[name="description"]');
      expect(description?.length ?? 0).toBeGreaterThan(40);

      // Канонический адрес — на боевом домене, а не на поддомене хостинга и не на localhost.
      const canonical = await metaOf(page, 'link[rel="canonical"]', "href");
      expect(canonical).toBe(absoluteUrl(route).replace(/\/$/, ""));
    });
  }

  test("описания публичных страниц различаются, а не повторяют одну строку", async ({ page }) => {
    const descriptions = new Set<string>();
    for (const route of INDEXABLE) {
      await page.goto(route);
      descriptions.add((await metaOf(page, 'meta[name="description"]')) ?? "");
    }
    // Четыре страницы — четыре разных описания: одинаковый текст на всех означал бы, что
    // route-specific метаданные снова перестали переопределяться.
    expect(descriptions.size).toBe(INDEXABLE.length);
  });

  test("боевой origin один на всё приложение", async ({ page }) => {
    // Ни vercel-поддомена, ни второго домена в разметке публичной страницы быть не должно.
    await page.goto(SITE);
    const html = await page.content();
    expect(html).not.toContain("aevix.vercel.app");
    expect(SITE_ORIGIN).toBe("https://aevix.org");
  });
});

test.describe("социальная карточка", () => {
  for (const route of INDEXABLE) {
    test(`${route} — og:url ведёт на саму страницу, а не на корень`, async ({ page }) => {
      await page.goto(route);
      const ogUrl = await metaOf(page, 'meta[property="og:url"]');
      expect(ogUrl).toBe(absoluteUrl(route).replace(/\/$/, ""));

      // og:title страницы — её собственный, а не унаследованный от корня (кроме самого корня).
      const ogTitle = await metaOf(page, 'meta[property="og:title"]');
      const title = await page.title();
      expect(ogTitle).toBeTruthy();
      expect(title).toContain(ogTitle!.replace(" — AEVIX", ""));
    });
  }

  for (const route of INDEXABLE) {
    test(`${route} — карточка несёт картинку, а не только текст`, async ({ page }) => {
      await page.goto(route);
      /**
       * Сторож против того, что этот проход уже ловил вживую: файловая конвенция
       * `opengraph-image.tsx` привязывает картинку к своему сегменту, и страница, объявившая
       * собственный `openGraph`, теряла её вместе с заменённым объектом. Ссылка приходила в
       * мессенджер голым текстом, а разметка при этом выглядела правильной.
       */
      expect(await metaOf(page, 'meta[property="og:image"]')).toBe(absoluteUrl(OG_IMAGE.path));
      expect(await metaOf(page, 'meta[name="twitter:image"]')).toBe(absoluteUrl(OG_IMAGE.path));
    });
  }

  test("обязательный набор og и twitter присутствует", async ({ page }) => {
    await page.goto(SITE);
    expect(await metaOf(page, 'meta[property="og:site_name"]')).toBe("AEVIX");
    expect(await metaOf(page, 'meta[property="og:type"]')).toBe("website");
    expect(await metaOf(page, 'meta[property="og:description"]')).toBeTruthy();
    expect(await metaOf(page, 'meta[property="og:image"]')).toBeTruthy();
    // summary_large_image, иначе карточка 1200×630 обрежется в квадрат по центру.
    expect(await metaOf(page, 'meta[name="twitter:card"]')).toBe("summary_large_image");
    expect(await metaOf(page, 'meta[name="twitter:image"]')).toBeTruthy();
  });

  test("картинка карточки действительно отдаётся, и в нужной пропорции", async ({ page, request }) => {
    await page.goto(SITE);
    const src = await metaOf(page, 'meta[property="og:image"]');
    // Адрес обязан быть абсолютным и на боевом домене: мессенджеру относительный путь не от чего
    // разрешать — он видит только присланную ссылку.
    expect(src).toBe(absoluteUrl(OG_IMAGE.path));

    // Забираем ту же картинку с локального сервера: проверяется путь из разметки, а не догадка о
    // нём, но за ответом идём туда, где приложение сейчас работает.
    const response = await request.get(new URL(src!).pathname);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/");
    // Непустой файл: `alt`, ширина и высота в разметке ничего не стоят, если по адресу пусто.
    expect((await response.body()).byteLength).toBeGreaterThan(5_000);

    // 1200×630 — пропорция, которую раскладывают Telegram, WhatsApp, Discord, LinkedIn и X.
    expect(await metaOf(page, 'meta[property="og:image:width"]')).toBe(String(OG_IMAGE.width));
    expect(await metaOf(page, 'meta[property="og:image:height"]')).toBe(String(OG_IMAGE.height));
    expect(await metaOf(page, 'meta[property="og:image:alt"]')).toBeTruthy();
  });
});

test.describe("приватные поверхности не индексируются", () => {
  for (const route of ["/app/login", "/app/projects", "/app/profile", "/app/settings"]) {
    test(`${route} — noindex`, async ({ page }) => {
      await page.goto(route);
      const robots = await metaOf(page, 'meta[name="robots"]');
      expect(robots).toContain("noindex");
    });
  }
});

test.describe("robots.txt", () => {
  test("пускает публичное и закрывает Workspace с API", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();

    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /app/");
    expect(body).toContain("Disallow: /api/");
    // Карта сайта указывается абсолютным адресом на боевом домене.
    expect(body).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);

    // `Disallow: /app` без слеша закрыл бы заодно `/apple-icon.png` — префиксное правило не
    // знает границ слова. Отдельная проверка: именно эта опечатка тихо ломает иконку iOS.
    expect(body).not.toMatch(/^Disallow: \/app$/m);
  });
});

test.describe("sitemap.xml", () => {
  test("содержит публичные страницы и ни одной приватной", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");
    const body = await response.text();

    for (const route of INDEXABLE) {
      expect(body).toContain(`<loc>${absoluteUrl(route)}</loc>`);
    }

    // Приватное в карту не попадает НИКОГДА. Проверка по подстроке, а не по точному URL:
    // запись про `/app/projects/abc` должна краснеть так же, как про `/app/projects`.
    for (const forbidden of ["/app", "/api", "login", "register", "settings", "profile"]) {
      expect(body).not.toContain(forbidden);
    }

    // Якорей лендинга здесь тоже нет: `#цены` — не отдельный URL, а дубль `/platform`.
    expect(body).not.toContain("#");
  });
});

test.describe("иконки браузера", () => {
  test("вкладка и сохранённая ссылка получают знак AEVIX", async ({ request }) => {
    const icon = await request.get("/icon.svg");
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toContain("svg");

    // PNG для iOS: Safari не берёт SVG для иконки «на экран Домой» и без этого файла рисует
    // на плитке уменьшенный скриншот страницы.
    const apple = await request.get("/apple-icon");
    expect(apple.status()).toBe(200);
    expect(apple.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("публичный контакт", () => {
  test("на сайте показан адрес на домене, а не личная почта", async ({ page }) => {
    await page.goto(SITE);
    const html = await page.content();

    expect(html).toContain(PUBLIC_CONTACT_EMAIL);
    expect(PUBLIC_CONTACT_EMAIL).toBe("hello@aevix.org");

    /**
     * Сторож против возврата личного адреса.
     *
     * Проверяется не конкретная строка, а КЛАСС: любой gmail/yandex/mail.ru в публичной
     * разметке. Тест на один известный адрес прошёл бы мимо второго личного ящика, а именно так
     * такие вещи и возвращаются — через copy-paste соседнего значения.
     */
    expect(html).not.toMatch(/[\w.+-]+@(gmail|yandex|mail\.ru|outlook|hotmail|icloud)\.\w+/i);
  });

  test("JSON-LD Organization несёт публичный адрес и боевой origin", async ({ page }) => {
    await page.goto(SITE);
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw!) as Record<string, unknown>;

    expect(data.email).toBe(PUBLIC_CONTACT_EMAIL);
    expect(data.url).toBe(SITE_ORIGIN);
    expect(data.name).toBe("AEVIX");

    // Structured data содержит только подтверждаемое: ни отзывов, ни рейтинга, ни адреса.
    expect(data.aggregateRating).toBeUndefined();
    expect(data.review).toBeUndefined();
    expect(data.address).toBeUndefined();
  });

  test("LEADS_TO_EMAIL не утекает в клиент", async ({ page }) => {
    // Получатель заявок — серверная переменная. Если её значение окажется в разметке или в
    // клиентском бандле, внутренний ящик станет публичным, и узнаем мы об этом от спамеров.
    const recipient = process.env.LEADS_TO_EMAIL;
    test.skip(!recipient, "LEADS_TO_EMAIL не задан в окружении — проверять нечего.");

    for (const route of [SITE, ENTRY]) {
      await page.goto(route);
      expect(await page.content()).not.toContain(recipient!);
    }
  });
});
