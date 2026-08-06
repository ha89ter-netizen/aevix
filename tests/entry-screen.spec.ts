import { test, expect } from "./support/fixtures";
import { ENTRY, SITE } from "./support/routes";

/**
 * Публичный входной экран — часть 1 публичного слоя.
 *
 * Проверяется не «нарисовалось», а те свойства, ради которых экран и разделён с лендингом:
 * пустая навигация, иерархия действий, два разных маршрута, честный охват перевода и то, что
 * тёмная тема не протекла в приложение.
 *
 * Отдельно проверяется отсек будущей экосистемы: он обязан занимать место с первого кадра, иначе
 * появление сцены на этапе 2 сдвинет заголовок и кнопки.
 */

const LOCALE_KEY = "aevix.locale";

test.describe("входной экран", () => {
  test("в навигации только логотип и языки — ни разделов, ни кнопок", async ({ page }) => {
    await page.goto(ENTRY);
    const nav = page.locator(".entry-nav");
    await expect(nav).toBeVisible();
    await expect(nav.getByLabel("AEVIX")).toBeVisible();

    // Единственный управляющий элемент панели — переключатель языка.
    await expect(nav.locator("button, a")).toHaveCount(1);

    // Рамки продукта здесь нет вовсе: ни общей шапки, ни боковой панели, ни кнопки консультации.
    await expect(page.locator(".shell-header")).toHaveCount(0);
    await expect(page.locator(".shell-sidebar")).toHaveCount(0);
    await expect(page.locator(".shell-cta")).toHaveCount(0);
  });

  test("две кнопки ведут в разные места, и смотреть важнее, чем входить", async ({ page }) => {
    await page.goto(ENTRY);
    const primary = page.locator(".entry-action.is-primary");
    const secondary = page.locator(".entry-action.is-secondary");

    await expect(primary).toHaveAttribute("href", SITE);
    await expect(secondary).toHaveAttribute("href", "/app/login");

    // Иерархия — не только в классе: основное действие стоит первым и в порядке чтения,
    // и в порядке табуляции. Порядок в разметке обязан совпадать с визуальным.
    const order = await page.locator(".entry-action").evaluateAll((nodes) =>
      nodes.map((node) => node.className.includes("is-primary")),
    );
    expect(order).toEqual([true, false]);
  });

  test("«Открыть сайт» уводит на основной сайт, а не прокручивает вход", async ({ page }) => {
    await page.goto(ENTRY);
    await page.locator(".entry-action.is-primary").click();
    await page.waitForURL(`**${SITE}`);
    // Это другой опыт: появляется рамка продукта, которой на входном экране нет.
    await expect(page.locator(".shell-header")).toBeVisible();
    await expect(page.locator(".entry-screen")).toHaveCount(0);
  });

  test("тёмная тема не выходит за пределы входного экрана", async ({ page }) => {
    await page.goto(ENTRY);
    await expect(page.locator("[data-surface='marketing']")).toHaveCount(1);

    for (const route of [SITE, "/app/projects"]) {
      await page.goto(route);
      await expect(page.locator("[data-surface='marketing']")).toHaveCount(0);
    }
  });

  test("язык переключается, сохраняется и переживает перезагрузку", async ({ page }) => {
    await page.goto(ENTRY);
    const headline = page.locator(".entry-headline");
    await expect(headline).toContainText("Бизнес работает");

    await page.locator(".entry-lang-trigger").click();
    await page.getByRole("menuitemradio", { name: /English/ }).click();

    await expect(headline).toContainText("Your business runs");
    await expect(page.locator(".entry-action.is-primary")).toContainText("Open website");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect(await page.evaluate((key) => localStorage.getItem(key), LOCALE_KEY)).toBe("en");

    await page.reload();
    await expect(headline).toContainText("Your business runs");

    // Казахский — полноценная локаль, а не подпись в списке.
    await page.locator(".entry-lang-trigger").click();
    await page.getByRole("menuitemradio", { name: /Қазақша/ }).click();
    await expect(headline).toContainText("Бизнес жұмыс істейді");
    await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  });

  test("переключатель честно говорит, что переведён только этот экран", async ({ page }) => {
    await page.goto(ENTRY);
    await page.locator(".entry-lang-trigger").click();
    await expect(page.locator(".entry-lang-scope")).toContainText("входной экран");

    // И самого переключателя нет там, где перевода ещё нет, — обещать язык всему продукту нельзя.
    await page.goto("/app/projects");
    await expect(page.locator(".entry-lang")).toHaveCount(0);
  });

  test("испорченный сохранённый язык не ломает экран", async ({ page }) => {
    // Запасной вариант — русский. Показать ключ вместо заголовка хуже, чем показать его по-русски.
    await page.addInitScript((key) => localStorage.setItem(key as string, "эльфийский"), LOCALE_KEY);
    await page.goto(ENTRY);
    await expect(page.locator(".entry-headline")).toContainText("Бизнес работает");
    await expect(page.locator(".entry-lang-trigger")).toContainText("RU");
  });

  test("сцена занимает место с первого кадра и очерчена, а не пуста", async ({ page }) => {
    await page.goto(ENTRY);
    const slot = page.locator(".entry-ecosystem");
    await expect(slot).toBeVisible();

    const box = await slot.boundingBox();
    expect(box, "сцена обязана существовать до появления графики").not.toBeNull();
    // Не «есть в разметке», а именно занимает заметную площадь: иначе графика этапа 2 сдвинет
    // весь макет. Доля экрана, а не пиксели: пропорции сцены разные на разных ширинах —
    // 4:3 на десктопе, панорама на телефоне, — и жёсткое число ломалось бы при каждой правке
    // композиции, ничего при этом не проверяя по существу.
    const viewport = page.viewportSize()!;
    expect(box!.height / viewport.height).toBeGreaterThan(0.15);
    expect(box!.width / viewport.width).toBeGreaterThan(0.3);

    // Внутри — плоскость со своими границами: слой независим от текста героя.
    await expect(page.locator("[data-ecosystem-stage]")).toHaveCount(1);

    // У пустоты обязан быть край. Без рамки поле читается как «не загрузилось», а не как воздух,
    // и композиция перестаёт быть законченной без будущей графики.
    const edge = await page.locator(".entry-ecosystem-plane").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: cs.borderTopWidth, ticks: el.querySelectorAll(".entry-plane-tick").length };
    });
    expect(edge.width).not.toBe("0px");
    expect(edge.ticks).toBe(4);
  });

  test("композиция закрыта снизу, и подпись называет сцену, а не разделы", async ({ page }) => {
    await page.goto(ENTRY);
    const base = page.locator(".entry-base");
    await expect(base).toBeVisible();
    await expect(page.locator("#entry-scene-name")).toHaveText("Карта процессов");

    // Основание — линия и одно имя. Появление здесь второй навигации означало бы возврат того,
    // от чего этот экран как раз отказался.
    await expect(base.locator("a, button")).toHaveCount(0);

    // Линия действительно закрывает композицию: она под кнопками и во всю ширину содержания.
    const [rule, actions] = await Promise.all([
      page.locator(".entry-base-rule").boundingBox(),
      page.locator(".entry-actions").boundingBox(),
    ]);
    expect(rule!.y).toBeGreaterThan(actions!.y + actions!.height);
    expect(rule!.width).toBeGreaterThan(200);

    // Имя сцены переводится вместе со всем остальным.
    await page.locator(".entry-lang-trigger").click();
    await page.getByRole("menuitemradio", { name: /English/ }).click();
    await expect(page.locator("#entry-scene-name")).toHaveText("Process map");
  });

  test("на экране нет обещаний того, чего на нём ещё нет", async ({ page }) => {
    // Законченная композиция не может содержать записку о собственной неполноте. Проверяется
    // именно это: любая формулировка вида «здесь появится…» возвращает экран в состояние
    // ожидания следующего этапа.
    await page.goto(ENTRY);
    const text = (await page.locator(".entry-screen").innerText()).toLowerCase();
    for (const promise of ["появится", "скоро", "в разработке", "coming"]) {
      expect(text, `на экране не должно быть «${promise}»`).not.toContain(promise);
    }
  });

  test("с клавиатуры проходится весь экран, и фокус видно", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "проверка клавиатуры");
    await page.goto(ENTRY);

    const reached: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      reached.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return el ? el.className || el.tagName : "";
        }),
      );
    }
    expect(reached.some((name) => name.includes("entry-lang-trigger"))).toBe(true);
    expect(reached.some((name) => name.includes("is-primary"))).toBe(true);
    expect(reached.some((name) => name.includes("is-secondary"))).toBe(true);

    // Обводка фокуса именно видимая, а не снятая ради красоты.
    const outline = await page
      .locator(".entry-action.is-primary")
      .evaluate((el) => {
        el.focus();
        return getComputedStyle(el).outlineStyle;
      });
    expect(outline).not.toBe("none");
  });

  test("меню языка закрывается по Escape", async ({ page }) => {
    await page.goto(ENTRY);
    await page.locator(".entry-lang-trigger").click();
    await expect(page.locator(".entry-lang-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".entry-lang-menu")).toHaveCount(0);
  });

  test("экран не едет вбок ни на одном размере", async ({ page }) => {
    await page.goto(ENTRY);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
