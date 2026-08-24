import { test, expect } from "@playwright/test";
import { ENTRY } from "./support/routes";
import { CAPABILITIES, CAPABILITY_LINKS } from "../src/components/entry/ecosystem/capabilities";
import {
  DENSITY_COUNT,
  activeEdgeIds,
  buildGraph,
  carrierEdgeIds,
  densityFor,
  intentEdgeIds,
  intentNodeIds,
} from "../src/components/entry/ecosystem/graph";
import { NEUTRAL_PROFILE, PROFILES, weightOf } from "../src/components/entry/ecosystem/profiles";

/**
 * Логика живой системы — обычным тестом, без браузера.
 *
 * Это возможно ровно потому, что граф отделён от отрисовки и не тянет за собой React. Проверки
 * здесь не про «нарисовалось», а про свойства, которые обещаны архитектурой: система
 * перестраивается под бизнес, ничего при этом не теряя, и остаётся одинаковой при каждой
 * загрузке.
 */

test.describe("живая система · логика", () => {
  test("композиция одинакова при каждой загрузке", async () => {
    // Случайная раскладка означала бы систему, которая не помнит себя. Дважды собранный граф
    // обязан совпасть до координаты.
    const first = buildGraph(NEUTRAL_PROFILE, "full");
    const second = buildGraph(NEUTRAL_PROFILE, "full");
    expect(JSON.stringify(first.nodes)).toBe(JSON.stringify(second.nodes));
  });

  test("подписи не сталкиваются: между местами есть просвет", async () => {
    // Зазор посчитан под ширину подписи: либо 0.2 по горизонтали, либо 0.07 по вертикали.
    for (const density of ["compact", "regular", "full"] as const) {
      const { nodes } = buildGraph(NEUTRAL_PROFILE, density);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = Math.abs(nodes[i].x - nodes[j].x);
          const dy = Math.abs(nodes[i].y - nodes[j].y);
          expect(dx > 0.2 || dy > 0.07, `${density}: ${nodes[i].id} и ${nodes[j].id} слишком близко`).toBe(true);
        }
      }
    }
  });

  test("узлы не выходят за края сцены", async () => {
    for (const density of ["compact", "regular", "full"] as const) {
      for (const node of buildGraph(NEUTRAL_PROFILE, density).nodes) {
        expect(node.x, `${node.id}`).toBeGreaterThanOrEqual(0.12);
        expect(node.x, `${node.id}`).toBeLessThanOrEqual(0.88);
        expect(node.y, `${node.id}`).toBeGreaterThanOrEqual(0.08);
        expect(node.y, `${node.id}`).toBeLessThanOrEqual(0.92);
      }
    }
  });

  test("каждой плотности хватает мест в композиции", async () => {
    for (const density of ["compact", "regular", "full"] as const) {
      const { nodes } = buildGraph(NEUTRAL_PROFILE, density);
      // Плюс ядро.
      expect(nodes).toHaveLength(DENSITY_COUNT[density] + 1);
    }
  });

  test("плотность считается по ширине сцены, а не по окну", async () => {
    expect(densityFor(356)).toBe("compact");
    expect(densityFor(643)).toBe("full");
    expect(densityFor(752)).toBe("full");
  });

  test("бизнес меняет систему: разные ниши — разный состав и разная громкость", async () => {
    const salon = buildGraph(PROFILES.salon, "regular");
    const law = buildGraph(PROFILES.law, "regular");

    const ids = (graph: typeof salon) => graph.nodes.filter((n) => !n.isCore).map((n) => String(n.id));
    expect(ids(salon)).not.toEqual(ids(law));

    // У салона опора — календарь и мессенджер, у юриста — знания и почта.
    expect(ids(salon)).toContain("calendar");
    expect(ids(law)).toContain("knowledge");
    expect(weightOf(PROFILES.salon, "calendar")).toBeGreaterThan(weightOf(PROFILES.law, "calendar"));
    expect(weightOf(PROFILES.law, "knowledge")).toBeGreaterThan(weightOf(PROFILES.salon, "knowledge"));
  });

  test("ничего не исчезает: незанятая возможность просто тише", async () => {
    // Прямое требование к поведению: продукт не должен выглядеть урезанным под клиента.
    for (const profile of Object.values(PROFILES)) {
      for (const capability of CAPABILITIES) {
        const weight = weightOf(profile, capability.id);
        expect(weight, `${profile.id}/${capability.id}`).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      }
    }
  });

  test("композиция асимметрична: ни одной оси зеркальности", async () => {
    // Правильная композиция читается как диаграмма, нарисованная дизайнером: мозг узнаёт правило
    // и перестаёт видеть систему. Проверяется отсутствие зеркальности и разнообразие расстояний.
    const nodes = buildGraph(NEUTRAL_PROFILE, "full").nodes.filter((n) => !n.isCore);

    const mirrored = nodes.filter((node) =>
      nodes.some((other) => Math.abs(other.x - (1 - node.x)) < 0.02 && Math.abs(other.y - node.y) < 0.02),
    );
    expect(mirrored.length, "композиция зеркальна по вертикальной оси").toBeLessThan(3);

    // Расстояния до ядра должны быть разными — иначе это кольцо.
    const radii = nodes.map((n) => Math.hypot(n.x - 0.5, n.y - 0.5));
    const spread = Math.max(...radii) - Math.min(...radii);
    expect(spread, "узлы стоят на одинаковом удалении — это окружность").toBeGreaterThan(0.15);
  });

  test("у сцены есть глубина, и она мала намеренно", async () => {
    const nodes = buildGraph(NEUTRAL_PROFILE, "full").nodes;
    const capabilities = nodes.filter((n) => !n.isCore);
    const depths = capabilities.map((n) => n.depth);

    // Планы действительно разные…
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(0.5);
    // …но ядро всегда ближе всех: взгляд обязан возвращаться в центр.
    expect(nodes.find((n) => n.isCore)!.depth).toBe(0);
  });

  test("несущих маршрутов единицы, а не половина сцены", async () => {
    const { edges } = buildGraph(NEUTRAL_PROFILE, "full");
    for (const phase of [0, 3, 7, 12, 19]) {
      const carriers = carrierEdgeIds(edges, phase);
      const open = activeEdgeIds(edges, phase);
      expect(carriers.size).toBeGreaterThan(0);
      // Осветлить многие связи значило бы поднять яркость всей сцены и потерять тишину.
      expect(carriers.size).toBeLessThanOrEqual(Math.ceil(open.size * 0.2));
      // И несущий обязан быть открыт: система не ведёт поток по закрытому пути.
      for (const id of carriers) expect(open.has(id)).toBe(true);
    }
  });

  test("система отвечает на намерение человека, а не на кнопку", async () => {
    const { edges } = buildGraph(NEUTRAL_PROFILE, "full");

    const explore = intentNodeIds("explore");
    const account = intentNodeIds("account");
    expect(explore.has("website")).toBe(true);
    expect(account.has("crm")).toBe(true);
    // Смыслы разные: витрина и рабочее место не должны совпадать.
    expect([...explore].filter((id) => account.has(id))).toHaveLength(0);

    // Оживают маршруты, а не отдельные точки.
    expect(intentEdgeIds(edges, "explore").size).toBeGreaterThan(0);
    expect(intentEdgeIds(edges, null).size).toBe(0);
  });

  test("связи осмысленны: оба конца существуют и путь не ведёт сам в себя", async () => {
    const known = new Set(CAPABILITIES.map((item) => item.id));
    for (const [a, b] of CAPABILITY_LINKS) {
      expect(known.has(a), `нет возможности ${a}`).toBe(true);
      expect(known.has(b), `нет возможности ${b}`).toBe(true);
      expect(a).not.toBe(b);
    }
  });

  test("система перекладывает пути, но никогда не остаётся без них", async () => {
    const { edges } = buildGraph(NEUTRAL_PROFILE, "full");
    const shots = [0, 1, 2, 5, 9, 14, 20].map((phase) => activeEdgeIds(edges, phase));

    for (const open of shots) {
      expect(open.size).toBeGreaterThanOrEqual(3);
      expect(open.size).toBeLessThan(edges.length);
    }
    // Набор действительно меняется — иначе «выбор пути» был бы декорацией.
    const signatures = new Set(shots.map((set) => [...set].sort().join("|")));
    expect(signatures.size).toBeGreaterThan(1);

    // И одна и та же фаза всегда даёт один и тот же набор: сцена не дёргается при перерисовке.
    expect([...activeEdgeIds(edges, 7)].sort()).toEqual([...activeEdgeIds(edges, 7)].sort());
  });
});

test.describe("живая система · на экране", () => {
  test("сцена живёт внутри плоскости этапа 1 и ничего не сдвигает", async ({ page }) => {
    await page.goto(ENTRY);
    await expect(page.locator(".eco-node").first()).toBeVisible();

    const fits = await page.evaluate(() => {
      const plane = document.querySelector(".entry-ecosystem-plane")!.getBoundingClientRect();
      const faces = [...document.querySelectorAll(".eco-node-face")].map((el) => el.getBoundingClientRect());
      return {
        outside: faces.filter(
          (f) => f.left < plane.left - 1 || f.top < plane.top - 1 || f.right > plane.right + 1 || f.bottom > plane.bottom + 1,
        ).length,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(fits.outside, "узел вылез за плоскость").toBe(0);
    expect(fits.pageOverflow).toBeLessThanOrEqual(1);
  });

  test("наведение подсвечивает соседей и приглушает остальное, а уход всё возвращает", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "наведение мышью");
    await page.goto(ENTRY);
    await expect(page.locator(".eco-node").first()).toBeVisible();

    await page.locator('[data-node="crm"]').hover();
    await expect(page.locator(".eco-node.is-near").first()).toBeVisible();
    expect(await page.locator(".eco-link.is-near").count()).toBeGreaterThan(0);
    expect(await page.locator(".eco-node.is-dimmed").count()).toBeGreaterThan(0);

    await page.mouse.move(5, 5);
    await expect(page.locator(".eco-node.is-dimmed")).toHaveCount(0);
  });

  test("ядро AEVIX постоянно светится — glow не зависит от motion (post-release 1)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "браузерная проверка ядра");
    await page.goto(ENTRY);
    const core = page.locator(".eco-node.is-core");
    await expect(core).toHaveCount(1);
    await expect(core.getByText("AEVIX")).toBeVisible();
    // Постоянный светящийся слой — статический ::after с градиентом (не анимация, не второе ядро).
    const glow = await core.evaluate((el) => getComputedStyle(el, "::after").backgroundImage);
    expect(glow).toContain("gradient");
    expect(glow).not.toBe("none");
  });

  test("ядро остаётся главным и светящимся при prefers-reduced-motion", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "браузерная проверка ядра");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ENTRY);
    const core = page.locator(".eco-node.is-core");
    await expect(core).toBeVisible();
    await expect(core.getByText("AEVIX")).toBeVisible();
    // Glow — постоянное состояние, а не анимация: остаётся и при reduced-motion (motion не
    // единственный источник визуальной активности ядра).
    const glow = await core.evaluate((el) => getComputedStyle(el, "::after").backgroundImage);
    expect(glow).toContain("gradient");
  });

  test("сцена — одна остановка табуляции, внутри ходят стрелками", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "проверка клавиатуры");
    await page.goto(ENTRY);
    await expect(page.locator(".eco-node").first()).toBeVisible();

    // Восемнадцать остановок табом означали бы, что до кнопки человек добирается двадцатым
    // нажатием. Сцена входит в порядок табуляции ровно один раз.
    const stops: string[] = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      stops.push(await page.evaluate(() => (document.activeElement as HTMLElement)?.className ?? ""));
    }
    expect(stops.filter((name) => name.includes("eco") && !name.includes("eco-node"))).toHaveLength(1);

    await page.locator(".eco").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const focused = await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset?.node);
    expect(focused).toBeTruthy();
    expect(focused).not.toBe("core");
    // С клавиатуры видно то же, что и мышью: подсветка не привязана к указателю.
    expect(await page.locator(".eco-node.is-near").count()).toBeGreaterThan(0);
  });

  test("при просьбе уменьшить анимацию система замирает, но остаётся читаемой", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(ENTRY);
    await expect(page.locator(".eco-node").first()).toBeVisible();
    await page.waitForTimeout(1500);

    expect(await page.locator(".eco.is-breathing").count()).toBe(0);
    expect(await page.locator(".eco-node").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    // Замереть — не значит исчезнуть: карта возможностей обязана остаться на месте и открытой.
    expect(await page.locator(".eco-node").count()).toBeGreaterThan(5);
    expect(await page.locator(".eco-link.is-open").count()).toBeGreaterThan(0);
    await context.close();
  });

  test("скрытая вкладка останавливает сцену, возвращение — оживляет", async ({ page }) => {
    await page.goto(ENTRY);
    await expect(page.locator(".eco.is-breathing")).toHaveCount(1);

    // Настоящее событие с подменённым `document.hidden`: безголовый браузер сам вкладку не прячет.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { get: () => true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator(".eco.is-breathing")).toHaveCount(0);

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { get: () => false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    // Здесь однажды была ошибка: флаг видимости затирал сам себя, и сцена не оживала уже никогда.
    await expect(page.locator(".eco.is-breathing")).toHaveCount(1);
  });

  test("ядро главное по массе, а не по яркости", async ({ page }) => {
    await page.goto(ENTRY);
    await expect(page.locator(".eco-node").first()).toBeVisible();

    const compared = await page.evaluate(() => {
      const core = document.querySelector(".eco-node.is-core .eco-node-face") as HTMLElement;
      const other = document.querySelector(".eco-node:not(.is-core) .eco-node-face") as HTMLElement;
      const c = core.getBoundingClientRect();
      const o = other.getBoundingClientRect();
      return {
        coreHeight: c.height,
        otherHeight: o.height,
        coreFont: parseFloat(getComputedStyle(core).fontSize),
        otherFont: parseFloat(getComputedStyle(other).fontSize),
        coreShadow: getComputedStyle(core).boxShadow.length,
        otherShadow: getComputedStyle(other).boxShadow.length,
        hasClearing: getComputedStyle(document.querySelector(".eco-node.is-core")!, "::before").backgroundImage !== "none",
      };
    });
    // Масса меряется высотой и плотностью, а НЕ площадью: у узла с длинной подписью площадь
    // больше, и сравнение по ней однажды уже соврало — «AI-ассистент» оказался «тяжелее» ядра.
    expect(compared.coreHeight).toBeGreaterThan(compared.otherHeight * 1.3);
    expect(compared.coreFont).toBeGreaterThan(compared.otherFont);
    expect(compared.coreShadow).toBeGreaterThan(compared.otherShadow);
    // И поле чистоты вокруг — именно оно возвращает взгляд в центр, а не свечение.
    expect(compared.hasClearing).toBe(true);
  });

  test("сцена отвечает на наведение к кнопкам героя", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "наведение мышью");
    await page.goto(ENTRY);
    await expect(page.locator(".eco-node").first()).toBeVisible();
    await expect(page.locator(".eco-node.is-wanted")).toHaveCount(0);

    await page.locator(".entry-action.is-secondary").hover();
    // «Войти» — это про своё рабочее место: клиенты, знания, расписание.
    await expect(page.locator(".eco-node.is-wanted")).not.toHaveCount(0);
    await expect(page.locator(".eco")).toContainText("CRM");
    const account = await page.locator(".eco-node.is-wanted .eco-node-title").allInnerTexts();
    expect(account).toContain("CRM");

    await page.locator(".entry-action.is-primary").hover();
    const explore = await page.locator(".eco-node.is-wanted .eco-node-title").allInnerTexts();
    // Витрина и рабочее место — разные ответы системы.
    expect(explore).not.toEqual(account);
    expect(explore).toContain("Сайт");

    await page.mouse.move(5, 5);
    await expect(page.locator(".eco-node.is-wanted")).toHaveCount(0);
  });

  test("с клавиатуры кнопки героя вызывают тот же отклик", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "проверка клавиатуры");
    await page.goto(ENTRY);
    await expect(page.locator(".eco-node").first()).toBeVisible();
    // Фокус равноправен наведению: идущий с клавиатуры видит то же самое.
    await page.locator(".entry-action.is-primary").focus();
    await expect(page.locator(".eco-node.is-wanted")).not.toHaveCount(0);
  });

  test("возможности читаются как текст, а не только как картинка", async ({ page }) => {
    await page.goto(ENTRY);
    await expect(page.locator(".eco-node").first()).toBeVisible();
    const text = await page.locator(".eco").innerText();
    for (const word of ["AEVIX", "CRM", "WhatsApp"]) expect(text).toContain(word);
    // И переводятся вместе со всем экраном.
    await page.locator(".entry-lang-trigger").click();
    await page.getByRole("menuitemradio", { name: /English/ }).click();
    await expect(page.locator(".eco")).toContainText("Website");
  });
});
