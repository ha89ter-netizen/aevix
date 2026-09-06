import { test, expect } from "./support/fixtures";
import { accountsAvailable, deleteAccount, makeProject, signIn, uniqueEmail } from "./support/accounts";

/**
 * Маршрут сохранения проектов: успех обязан быть заслуженным.
 *
 * Самый дорогой класс дефектов здесь — не отказ, а ЛОЖНОЕ подтверждение. Отказ виден: человек
 * видит ошибку и повторяет. Ложное «сохранено» невидимо ровно до того момента, когда работа уже
 * пропала, — а клиент, поверив ответу, к этому моменту успевает стереть локальную копию
 * (`clearLocalProjectsAfterMigration` в `projects.tsx`).
 *
 * Проверяется поэтому не «вернулось ли 200», а «совпадает ли то, что лежит на сервере, с тем, что
 * отправили». Разница между этими двумя проверками и есть весь смысл набора: первая была бы
 * зелёной на всех трёх отказах ниже.
 *
 * Требует настоящей базы — как и `accounts.spec.ts`, и по той же причине: проверять сохранность
 * работы клиента на подделке хранилища бессмысленно. Без `DATABASE_URL` набор пропускает себя.
 */

test.describe("сохранение проектов", () => {
  test.skip(!accountsAvailable, "нужны DATABASE_URL и AUTH_SECRET — см. .env.example");

  const created: string[] = [];
  const account = () => {
    const email = uniqueEmail();
    created.push(email);
    return email;
  };

  test.afterAll(async () => {
    for (const email of created) await deleteAccount(email);
  });

  /** Что РЕАЛЬНО лежит на сервере, а не что ответил маршрут записи. */
  const onServer = async (page: import("@playwright/test").Page): Promise<string[]> => {
    const response = await page.request.get("/api/projects");
    expect(response.ok(), "чтение проектов не удалось").toBe(true);
    const body = (await response.json()) as { projects: Array<{ id: string }> };
    return body.projects.map((project) => project.id);
  };

  test("тело, которое не удалось разобрать, не стирает аккаунт", async ({ page }) => {
    await signIn(page, account());

    const mine = makeProject("Единственный проект");
    const saved = await page.request.put("/api/projects", { data: { projects: [mine] } });
    expect(saved.ok()).toBe(true);
    expect(await onServer(page)).toEqual([mine.id]);

    /**
     * `{projects: null}` — не выдуманный случай, а форма любого сбоя на стороне клиента:
     * переименованное поле, ошибка сериализации, промах в рефакторинге. Важно, ЧТО делает
     * сервер, получив тело без пригодного списка.
     *
     * Стереть всё — худший из возможных ответов, а стереть всё и сказать «сохранено» — хуже
     * вдвойне: клиент считает такой ответ подтверждением.
     */
    const wiped = await page.request.put("/api/projects", { data: { projects: null } });
    expect(
      await onServer(page),
      "пустой список стёр аккаунт: тело без проектов не должно означать «удалить всё»",
    ).toEqual([mine.id]);
    expect(wiped.status(), "и уж точно это не «успех»").not.toBe(200);
  });

  test("набор сверх потолка отвергается целиком, а не молча обрезается", async ({ page }) => {
    await signIn(page, account());

    /**
     * Обрезка `slice(0, MAX_PROJECTS)` опаснее отказа. Отвергнутый запрос человек повторит;
     * обрезанный — нет, потому что ему ответили «сохранено», и лишние проекты исчезают с
     * сервера тем же запросом (`delete ... id <> all(ids)`), а следом и локально.
     *
     * 201 проект — на один больше потолка: проверяется граница, а не «много».
     */
    const many = Array.from({ length: 201 }, (_, index) => makeProject(`Проект ${index + 1}`, `over-${index}`));
    const response = await page.request.put("/api/projects", { data: { projects: many } });

    expect(response.status(), "потолок обязан быть отказом, а не тихой обрезкой").toBe(413);
    expect(
      (await onServer(page)).length,
      "отвергнутый запрос не должен ничего записывать",
    ).toBe(0);
  });

  test("PUT не отвечает «сохранено», когда часть проектов отброшена", async ({ page }) => {
    await signIn(page, account());

    const good = makeProject("Хороший проект");
    // Проект без имени нормализацию не проходит. Клиент такого не пришлёт — но если пришлёт,
    // ответ обязан сказать правду, а не посчитать отброшенное несуществующим.
    const broken = { ...makeProject("будет удалено"), name: "" };

    const response = await page.request.put("/api/projects", { data: { projects: [good, broken] } });
    expect(
      response.status(),
      "часть набора отброшена — это не 200: сравнение идёт с ПРИСЛАННЫМ, а не с нормализованным",
    ).not.toBe(200);
  });

  test("PATCH не отвечает «сохранено» на правку, которую не записал", async ({ page }) => {
    await signIn(page, account());

    const base = makeProject("Исходный");
    await page.request.put("/api/projects", { data: { projects: [base] } });

    /**
     * Этим путём идёт досохранение при закрытии вкладки (`flush` → `PATCH`). Там повторить
     * некому: страницы уже нет. Молчаливое «сохранено» здесь означает потерю последней правки
     * без единого следа.
     */
    const broken = { ...base, name: "" };
    const response = await page.request.patch("/api/projects", { data: { upsert: [broken] } });

    expect(
      response.status(),
      "правка не записана — ответ обязан это сказать",
    ).not.toBe(200);
    const body = (await response.json()) as { saved?: number };
    expect(body.saved ?? 0, "нечего было сохранять — значит не «сохранено»").toBe(0);
  });
});
