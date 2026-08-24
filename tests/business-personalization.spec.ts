import { test, expect, type Page, type Route } from "./support/fixtures";
import { SITE } from "./support/routes";

/**
 * Once a business is recognised it becomes the source of state for the whole page: the Hero
 * dashboard, cases, solutions and CTAs all adapt, and the product sidebar reflects it.
 * The analysis endpoint is mocked for determinism.
 */

const FIELD = "#hero-business-input";
const RESULT = ".hero-result";
const DIALOG = '[role="dialog"]';
const BARBER_TEXT = "У меня барбершоп на 3 мастера, запись вручную";

async function mockSuccess(page: Page, summary = "Разбор барбершопа готов.") {
  await page.route("**/api/business-analysis", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: { summary }, analysis: summary }),
    }),
  );
}

async function gotoHydrated(page: Page) {
  await page.goto(SITE);
  const field = page.locator(FIELD);
  await expect(field).toBeVisible();
  // Gate on hydration (controlled textarea wipes pre-hydration values).
  await expect(async () => {
    await field.fill("·");
    await expect(field).toHaveValue("·", { timeout: 400 });
  }).toPass({ timeout: 8000 });
  await field.fill("");
  await field.blur();
}

async function analyzeBarber(page: Page) {
  await mockSuccess(page);
  await gotoHydrated(page);
  await page.locator(FIELD).fill(BARBER_TEXT);
  await page.locator(FIELD).press("Enter");
  await expect(page.locator(RESULT)).toBeVisible();
}

/** The sidebar is pinned open on desktop and lives behind the hamburger below 1024px. */
async function openNav(page: Page) {
  const menu = page.locator(".shell-menu-button");
  if (await menu.isVisible()) {
    await expect(async () => {
      await menu.click();
      await expect(page.locator(".shell-sidebar")).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 20000 });
  }
  await expect(page.locator(".shell-sidebar")).toBeVisible();
}

test.describe("recommended badge", () => {
  test("плашка «Рекомендуем» не налезает на кнопку «Сценарий» и не выходит за карточку", async ({ page }) => {
    await analyzeBarber(page);
    await page.locator("#стоимость").scrollIntoViewIfNeeded();
    await page.addStyleTag({ content: "[data-reveal]{opacity:1!important;visibility:visible!important;transform:none!important}" });

    const cards = page.locator(".pricing-scene article.is-recommended");
    // Щедрое ожидание: карточка появляется только после того, как персонализация уложится, а под
    // нагрузкой полного прогона это дольше стандартных пяти секунд. Ждём настоящий признак, а не
    // прикрываемся повтором.
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Плашка стояла абсолютом в правом верхнем углу, ровно там же, где кнопка «Сценарий» в
    // потоке. Слова накладывались и читались как одна нечитаемая надпись.
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const badge = await card.locator(".hero-recommend-badge").boundingBox();
      const scenario = await card.locator(".capability-demo").boundingBox();
      const title = await card.locator("h3").boundingBox();
      const box = await card.boundingBox();
      expect(badge, `карточка ${i}: плашка не найдена`).toBeTruthy();

      const overlaps = (a: typeof badge, b: typeof badge) =>
        Boolean(a && b && a.x + a.width > b.x && b.x + b.width > a.x && a.y + a.height > b.y && b.y + b.height > a.y);
      expect(overlaps(badge, scenario), `карточка ${i}: плашка перекрывает «Сценарий»`).toBe(false);
      expect(overlaps(badge, title), `карточка ${i}: плашка перекрывает заголовок`).toBe(false);
      // И не вылезает за края карточки.
      expect(badge!.x).toBeGreaterThanOrEqual(box!.x - 1);
      expect(badge!.x + badge!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
    }
  });

  test("плашка остаётся целой на узком экране", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 900 });
    await analyzeBarber(page);
    await page.locator("#стоимость").scrollIntoViewIfNeeded();
    await page.addStyleTag({ content: "[data-reveal]{opacity:1!important;visibility:visible!important;transform:none!important}" });
    const card = page.locator(".pricing-scene article.is-recommended").first();
    const badge = await card.locator(".hero-recommend-badge").boundingBox();
    const scenario = await card.locator(".capability-demo").boundingBox();
    expect(badge && scenario && !(badge.x + badge.width > scenario.x && scenario.x + scenario.width > badge.x && badge.y + badge.height > scenario.y && scenario.y + scenario.height > badge.y)).toBe(true);
    // Текст не обрезан: видимая высота не меньше содержимого.
    const clipped = await card.locator(".hero-recommend-badge").evaluate((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    expect(clipped, "текст плашки обрезан").toBe(false);
  });
});

test.describe("site personalisation", () => {
  test("recognised business adapts cases and solutions", async ({ page }) => {
    await analyzeBarber(page);

    // Cases section gains a personalised scenario card.
    const personalCase = page.locator(".hero-personal-case");
    await expect(personalCase).toBeVisible();
    await expect(personalCase.getByText(/Ваш сценарий · Барбершоп/)).toBeVisible();

    // Pricing spotlights the 3 recommended modules for a barbershop. Count is scroll-independent
    // (the cards live in a scroll-reveal grid); scroll one in to prove the badge renders.
    // Asserted by count, not visibility: these cards live inside the site's scroll-reveal
    // grid, so visibility depends on that system rather than on the personalisation itself.
    const recommended = page.locator(".pricing-scene article.is-recommended");
    await expect(recommended).toHaveCount(3);
    await expect(page.locator(".pricing-scene .hero-recommend-badge")).toHaveCount(3);
  });

  test("pricing states WHY these modules are recommended (deterministic reason, once)", async ({ page }) => {
    await analyzeBarber(page);
    const reason = page.locator(".pricing-recommend-reason");
    // Shown once — a single clean composition, not a copy on every card.
    await expect(reason).toHaveCount(1);
    // Barbershop is a booking niche → the deterministic reason speaks about запись, not marketing.
    await expect(reason).toContainText("запис");
    await expect(reason).toContainText("Почему");
  });

  test("generic gets NO invented niche reason at pricing", async ({ page }) => {
    await mockSuccess(page, "Разбор готов.");
    await gotoHydrated(page);
    // Nothing category-specific → generic. No niche-specific "почему" is fabricated.
    await page.locator(FIELD).fill("хочу больше заявок");
    await page.locator(FIELD).press("Enter");
    await expect(page.locator(RESULT)).toBeVisible();
    await expect(page.locator(".pricing-recommend-reason")).toHaveCount(0);
  });

  test("Hero result shows Understanding, not fabricated numbers (Wave 4)", async ({ page }) => {
    await analyzeBarber(page);
    const result = page.locator(RESULT);
    // Known / Inferred / Proposed — three understanding rows, plus the proposed-system roadmap.
    await expect(result.locator(".hero-understanding-row")).toHaveCount(3);
    await expect(result.locator(".hero-roadmap-step")).toHaveCount(5);
    // The fabricated analytics are gone: no metric tiles, no "%/часов/выручка" claims.
    await expect(result.locator(".hero-metric")).toHaveCount(0);
    await expect(result.getByText("Выручка")).toHaveCount(0);
    await expect(result.getByText("Часов/нед.")).toHaveCount(0);
    await expect(result.getByText(/\+\d+\s*%/)).toHaveCount(0);
  });

  test("recognised business is stated qualitatively, no numeric confidence", async ({ page }) => {
    await analyzeBarber(page);
    const result = page.locator(RESULT);
    // Header states understanding qualitatively; no numeric recognition % anywhere on the card.
    await expect(result.getByText("AEVIX понял")).toBeVisible();
    await expect(result.locator(".hero-confidence")).toHaveCount(0);
    await expect(result.getByText("Что поняли")).toBeVisible();
  });

  test("unrecognised business is honest, not fake niche expertise", async ({ page }) => {
    await mockSuccess(page, "Разбор готов.");
    await gotoHydrated(page);
    // Nothing category-specific: detection falls back to generic — and says so plainly.
    await page.locator(FIELD).fill("хочу больше заявок");
    await page.locator(FIELD).press("Enter");
    const result = page.locator(RESULT);
    await expect(result).toBeVisible();
    await expect(result.getByText("Тип бизнеса не распознан")).toBeVisible();
    await expect(result.getByText(/Не удалось уверенно определить тип бизнеса/)).toBeVisible();
  });

  test("whole-site accent re-themes to the business", async ({ page }) => {
    await analyzeBarber(page);
    // The shell's registered accent channel morphs away from the default violet (122,92,255).
    await expect
      .poll(() =>
        page.locator(".shell").evaluate((el) =>
          Math.round(parseFloat(getComputedStyle(el).getPropertyValue("--accent-r"))),
        ),
      )
      .toBe(109); // barbershop accent r-channel
  });

  test("FAQ answers adapt to the business", async ({ page }) => {
    await analyzeBarber(page);
    const faq = page.locator("#faq");
    // Counts are scroll-independent; the section lives in scroll-reveal blocks.
    await expect(faq.locator(".faq-item")).toHaveCount(3);
    await expect(faq.getByText(/FAQ · Барбершоп/)).toHaveCount(1);
    // The section now sits further down a longer page, so scrollIntoViewIfNeeded's instant jump
    // doesn't reliably cross the GSAP/ScrollTrigger reveal threshold on every viewport — force it
    // visible the same way business-personalization's own AI-analysis test above does for the
    // same class of scroll-reveal-hidden content.
    await page.addStyleTag({
      content: "[data-reveal]{opacity:1!important;visibility:visible!important;transform:none!important;filter:none!important}",
    });
    const firstItem = faq.locator(".faq-item").first();
    await firstItem.scrollIntoViewIfNeeded();
    await expect(firstItem.getByText(/Как клиенты будут записываться/)).toBeVisible();
  });

  // Хелпер: заполнить обязательные поля заявки.
  async function fillLead(page: Page) {
    const contact = page.locator("#контакты");
    await contact.scrollIntoViewIfNeeded();
    await contact.locator(".lead-field", { hasText: "Имя" }).locator(".lead-input").fill("Иван");
    await contact.locator(".lead-field", { hasText: "Telegram" }).locator(".lead-input").first().fill("@ivan");
    return contact;
  }

  test("AEVIX «сайт» показывает 30 дней сопровождения; только он, и это НЕ демо (post-release 2)", async ({ page }) => {
    await mockSuccess(page);
    await gotoHydrated(page);
    await page.locator("#стоимость").scrollIntoViewIfNeeded();
    const notes = page.locator(".pricing-scene .product-support-note");
    // Условие есть только у продукта «сайт» — другие продукты его не наследуют.
    await expect(notes).toHaveCount(1);
    await expect(notes).toContainText("30 дней");
    // Цены продуктов AEVIX НЕ маркируются как «Демо-цены» — это семантика generated business.
    await expect(page.locator(".pricing-scene").getByText("Демо-цены")).toHaveCount(0);
    // И никаких запрещённых обещаний рядом.
    await expect(page.locator(".pricing-scene").getByText("24/7")).toHaveCount(0);
  });

  test("lead: submit → email → success, БЕЗ WhatsApp (post-release 1)", async ({ page }) => {
    await analyzeBarber(page);
    // analyzeBarber waits only for .hero-result; business-context holds a ~2.1s minimum "analyzing"
    // state, so wait for the personalised case (status "ready") before the niche attaches to the lead.
    await expect(page.locator(".hero-personal-case")).toBeVisible();

    // Записываем любые window.open — после submit их быть НЕ должно (WhatsApp ушёл из flow).
    await page.evaluate(() => {
      (window as unknown as { __opens: unknown[] }).__opens = [];
      window.open = ((...a: unknown[]) => {
        (window as unknown as { __opens: unknown[] }).__opens.push(a);
        return null;
      }) as typeof window.open;
    });
    await page.route("**/api/lead", (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
    );

    const contact = page.locator("#контакты");
    await contact.scrollIntoViewIfNeeded();
    await expect(contact.locator(".lead-textarea")).toHaveValue(BARBER_TEXT); // prefill из Hero
    const submit = contact.locator(".lead-submit");
    await expect(submit).toBeDisabled(); // validation: без имени/контакта submit невозможен
    await fillLead(page);
    await expect(submit).toBeEnabled();

    const leadRequest = page.waitForRequest(
      (request) => request.url().includes("/api/lead") && request.method() === "POST",
    );
    await submit.click();
    await expect(contact.locator(".contact-sent")).toBeVisible();
    await expect(contact.getByText("Заявка отправлена")).toBeVisible();

    const request = await leadRequest;
    expect(request.postDataJSON()).toMatchObject({ name: "Иван", contact: "@ivan", business: BARBER_TEXT, niche: "Барбершоп" });

    // Никакого WhatsApp/redirect/новой вкладки.
    expect(await page.evaluate(() => (window as unknown as { __opens: unknown[] }).__opens)).toEqual([]);
  });

  test("lead: провайдер упал → честная ошибка, данные целы, Retry работает", async ({ page }) => {
    await analyzeBarber(page);
    await expect(page.locator(".hero-personal-case")).toBeVisible();

    let fail = true;
    await page.route("**/api/lead", (route: Route) =>
      fail
        ? route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "boom" }) })
        : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
    );
    const contact = await fillLead(page);
    const nameInput = contact.locator(".lead-field", { hasText: "Имя" }).locator(".lead-input");
    await contact.locator(".lead-submit").click();

    // Честная ошибка, НЕ ложное «отправлено».
    await expect(contact.locator(".lead-error")).toBeVisible();
    await expect(contact.locator(".contact-sent")).toHaveCount(0);
    // Введённые данные сохранились.
    await expect(nameInput).toHaveValue("Иван");

    // Retry: сервер теперь принимает → успех.
    fail = false;
    await contact.locator(".lead-submit").click();
    await expect(contact.locator(".contact-sent")).toBeVisible();
  });

  test("lead: двойной клик не шлёт два письма", async ({ page }) => {
    await analyzeBarber(page);
    await expect(page.locator(".hero-personal-case")).toBeVisible();

    let count = 0;
    await page.route("**/api/lead", async (route: Route) => {
      count += 1;
      await new Promise((resolve) => setTimeout(resolve, 400)); // держим запрос в полёте
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    const contact = await fillLead(page);
    const submit = contact.locator(".lead-submit");
    await submit.click();
    await submit.click({ force: true }).catch(() => {}); // второй клик во время «Отправляем…»
    await expect(contact.locator(".contact-sent")).toBeVisible();
    expect(count).toBe(1);
  });

  test("reset returns the site to its neutral state", async ({ page }) => {
    await analyzeBarber(page);
    await expect(page.locator(".hero-personal-case")).toBeVisible();

    await openNav(page);
    await expect(page.locator(".shell-persona")).toBeVisible();
    await page.locator(".shell-persona-reset").click();

    // The persona panel disappears along with every personalised block.
    await expect(page.locator(".shell-persona")).toHaveCount(0);
    await expect(page.locator(".hero-personal-case")).toHaveCount(0);
    await expect(page.locator(".pricing-scene .hero-recommend-badge")).toHaveCount(0);
  });
});

test.describe("ai consultant chat", () => {
  test("chat history scrolls with the mouse wheel (Lenis must not hijack it)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only wheel scenario");
    await page.route("**/api/business-analysis", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            shortAnswer: "Да. Для кофейни с доставкой в директе стоит подключить AI-консультанта — часть заказов сейчас теряется в переписке.",
            reasons: ["Заказы принимаются вручную в мессенджерах.", "В пиковые часы часть обращений теряется.", "Повторяющиеся вопросы о меню отнимают время команды."],
            recommendedSolution: "Подключить AI-консультанта в WhatsApp и Telegram, который примет заказ и передаст его в единый статус доставки.",
            summary: "В кофейне с доставкой заказы принимаются вручную в мессенджерах — часть теряется в пик.",
            problems: ["Заказы теряются между чатами", "Нет единого статуса доставки", "Повторяющиеся вопросы о меню", "Ручной сбор адресов"],
            recommendations: ["AI-консультант в WhatsApp и Telegram", "CRM с заказами и статусами", "Автоподтверждения и напоминания", "Меню и доставка в одном сценарии", "Сбор отзывов после заказа"],
            flow: ["Гость", "AI-консультант", "Заказ", "CRM", "Доставка", "Отзыв"],
            callToAction: "Обсудим автоматизацию приёма заказов под вашу кофейню.",
          },
        }),
      }),
    );
    await gotoHydrated(page);
    // Reveal the section (its blocks are scroll-reveal-hidden) so the field is interactable.
    await page.addStyleTag({
      content: "[data-reveal]{opacity:1!important;visibility:visible!important;transform:none!important;filter:none!important}",
    });

    const scene = page.locator("#ai-анализ");
    await scene.getByLabel("Описание бизнеса для AI-консультанта").fill("у меня кофейня с доставкой, заказы в директе");
    await scene.getByRole("button", { name: "Проанализировать бизнес" }).click();
    await expect(scene.locator("article")).toBeVisible({ timeout: 15000 });

    const chat = page.locator(".aevix-ai-scroll");
    await expect
      .poll(() => chat.evaluate((el) => el.scrollHeight > el.clientHeight + 1))
      .toBe(true);

    const box = await chat.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await chat.evaluate((el) => Math.round(el.scrollTop));
    await page.mouse.wheel(0, 600); // the new message is pinned near the top, so scroll down
    await expect
      .poll(() => chat.evaluate((el) => Math.round(el.scrollTop)))
      .toBeGreaterThan(before);
  });
});

test.describe("consultation popup", () => {
  test("header CTA opens the channel picker without scrolling", async ({ page }, testInfo) => {
    // The header button is desktop-only; on mobile the entry point is the Navigation Center.
    test.skip(testInfo.project.name !== "desktop", "desktop-only header CTA");
    await gotoHydrated(page);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.getByRole("button", { name: "Консультация" }).click();

    const popup = page.locator(".consult");
    await expect(popup).toBeVisible();
    await expect(popup.locator(".consult-option")).toHaveCount(2);
    await expect(popup.locator(".consult-wa")).toHaveAttribute("href", /wa\.me/);
    await expect(popup.locator(".consult-tg")).toHaveAttribute("href", /t\.me/);
    // Opening the popup must not scroll the page.
    expect(await page.evaluate(() => window.scrollY)).toBe(y0);

    // Closing leaves no scroll lock.
    await page.keyboard.press("Escape");
    await expect(page.locator(".consult")).toHaveCount(0);
    const state = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollBy(0, 200);
      const moved = window.scrollY !== before;
      window.scrollTo(0, before);
      return { moved, position: document.body.style.position, overflow: document.body.style.overflow };
    });
    expect(state.moved).toBe(true);
    expect(state.position).toBe("");
    expect(state.overflow).toBe("");
  });
});

test.describe("product navigation", () => {
  test("the sidebar lists every landing section and nothing else", async ({ page }) => {
    await gotoHydrated(page);
    await openNav(page);
    await expect(page.locator(".shell-sidebar .shell-nav-item")).toHaveText([
      "Главная",
      "Возможности",
      "Как работает",
      "Кейсы",
      "Цены",
      "FAQ",
      "Контакты",
    ]);
    // Nothing personalised yet, so no persona panel.
    await expect(page.locator(".shell-persona")).toHaveCount(0);
  });

  test("selecting a destination scrolls to it without locking scroll", async ({ page }) => {
    await gotoHydrated(page);
    await openNav(page);

    await page.locator(".shell-nav-item", { hasText: "Цены" }).click();

    // The target section is scrolled into view...
    await expect(page.locator("#стоимость")).toBeInViewport({ timeout: 5000 });

    // ...and no scroll lock lingers.
    const state = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollBy(0, 300);
      const moved = window.scrollY !== before;
      window.scrollTo(0, before);
      return { moved, position: document.body.style.position, overflow: document.body.style.overflow };
    });
    expect(state.moved).toBe(true);
    expect(state.position).toBe("");
    expect(state.overflow).toBe("");
  });

  test("reflects the recognised business", async ({ page }) => {
    await analyzeBarber(page);
    await openNav(page);
    const persona = page.locator(".shell-persona");
    await expect(persona).toBeVisible();
    await expect(persona.getByText(/Барбершоп/)).toBeVisible();
  });
});
