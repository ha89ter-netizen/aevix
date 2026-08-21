import { test, expect, type Page } from "./support/fixtures";
import {
  buildFallbackWebsiteConcept,
  validateWebsiteConceptInput,
  type ConceptStyleId,
  type WebsiteConcept,
} from "../src/lib/website-concept";
import { compositionForStyle, heroCopyBudget, type ConceptLang } from "../src/lib/concept-composition";

/**
 * Адаптивная типографика сгенерированных сайтов (этап 3, дополнение).
 *
 * Проверяет обещание «copy и layout договариваются»: длинный текст, длинное слово, три языка и три
 * ширины НЕ должны рождать горизонтальное переполнение, обрезку, многоточие значимого текста,
 * перенос слова посреди или дефис. И заголовок не проваливается ниже типографического пола — он
 * остаётся заголовком, а не body-текстом.
 *
 * Тест НЕ пиксельный: он читает вычисленные стили и геометрию (scrollWidth vs clientWidth, размер
 * шрифта, hyphens, число строк) — то, что должно ломаться, если типографику снова отдадут на волю
 * браузера. Ровно то ломающееся ожидание, которого требует урок «тест, который не может упасть».
 *
 * Рендер идёт через реальный превью Workspace (`/app/projects/<id>/design`, браузерное хранилище
 * для не вошедших), а не через фикстуру: адаптив держится на `@container` внутри `.concept-device`,
 * и проверять его надо в настоящем контейнере.
 */

test.use({ contextOptions: { reducedMotion: "reduce" } });

/** Абсолютный пол H1 = 2.2rem (см. --concept-h1-floor). В px при корне 16px, с допуском на округление. */
const H1_FLOOR_PX = 2.2 * 16 - 1.5;

type StressCase = {
  label: string;
  styleId: ConceptStyleId;
  lang: ConceptLang;
  /** Длинный заголовок с очень длинным ОДНИМ словом — худший случай для переполнения и переноса. */
  title: string;
  subtitle: string;
  cta: string;
  service: string;
};

// По одному кейсу на каждую hero-геометрию, языки чередуются — так в матрицу попадают все пять
// геометрий и все три языка. Заголовки нарочно длинные и содержат неразрывно длинное слово.
const CASES: StressCase[] = [
  {
    label: "overlap · ru",
    styleId: "editorial",
    lang: "ru",
    title: "Красота и уверенность начинаются с профессиональногоприкосновения",
    subtitle: "Опытные мастера подчёркивают вашу естественную красоту бережными процедурами каждый день.",
    cta: "Записаться на консультацию",
    service: "Комплексный уходовый ритуал с массажем и укладкой",
  },
  {
    label: "image-led · en",
    styleId: "glass",
    lang: "en",
    title: "Extraordinary transformations crafted with uncompromisingprofessionalism",
    subtitle: "Our specialists reveal your natural beauty through attentive, unhurried treatments.",
    cta: "Book a free consultation now",
    service: "Comprehensive rejuvenating treatment with styling",
  },
  {
    label: "canvas · kk",
    styleId: "brutalist",
    lang: "kk",
    title: "Сұлулық пен сенімділік кәсіпқойлықпенбасталады бүгін",
    subtitle: "Тәжірибелі шеберлер сіздің табиғи әдемілігіңізді күнделікті ұқыпты күтіммен ашады.",
    cta: "Кеңесуге жазылу",
    service: "Толық күтім рәсімі және сәндеу қызметі",
  },
  {
    label: "statement · ru",
    styleId: "premium",
    lang: "ru",
    title: "Совершенство в каждой детали премиальногообслуживания",
    subtitle: "Изысканность и забота в каждом прикосновении наших мастеров.",
    cta: "Записаться",
    service: "Индивидуальная программа преображения образа",
  },
  {
    label: "split · kk",
    styleId: "modern",
    lang: "kk",
    title: "Кәсіпқой команда сенімділікпенкөмектеседі әрдайым",
    subtitle: "Біз әр клиентке жеке көзқараспен қараймыз және сапалы шешім ұсынамыз.",
    cta: "Кеңес алу",
    service: "Кешенді заңгерлік сүйемелдеу қызметі",
  },
];

const WIDTHS = [
  { name: "desktop", px: 1200 },
  { name: "tablet", px: 820 },
  { name: "mobile", px: 390 },
];

function buildStressConcept(kase: StressCase): WebsiteConcept {
  const input = validateWebsiteConceptInput({
    businessType: "Другое",
    businessName: "STRESS",
    styleId: kase.styleId,
    colorIds: ["purple"],
    customColors: "",
    goals: ["Показывать услуги", "Записывать клиентов", "Вызывать доверие"],
    sections: ["services", "about", "reviews", "booking", "contacts"],
    wishes: "",
  });
  if (!input) throw new Error("invalid stress input");
  const concept = buildFallbackWebsiteConcept(input);
  const home = concept.pages[0];
  // Подменяем именно тот copy, который проверяем: заголовок, подзаголовок, CTA и названия услуг.
  home.hero.title = kase.title;
  home.hero.subtitle = kase.subtitle;
  home.hero.primaryCta = kase.cta;
  home.hero.secondaryCta = kase.cta;
  const services = Array.from({ length: 4 }, (_, i) => ({ name: kase.service, price: `${(i + 3) * 1000} ₸` }));
  concept.offers = { products: [], services };
  return concept;
}

function seedProject(concept: WebsiteConcept, id: string) {
  const now = 1_700_000_000_000;
  return {
    id,
    name: concept.businessName,
    businessType: concept.businessType,
    businessDescription: "",
    city: "Астана",
    preferredStyleIds: [],
    preferredColorIds: [],
    goals: [],
    sections: [],
    wishes: "",
    generatedAt: now,
    publishedAt: null,
    designerLog: [],
    editHistory: [],
    redoHistory: [],
    createdAt: now,
    updatedAt: now,
    analysis: null,
    design: concept,
    pricing: null,
  };
}

/** Форсирует ширину контейнера превью и снимает обрезку встроенного Workspace, чтобы @container
 *  срабатывал на нужном пороге, а измерения не искажались рамкой эмбеда. */
function forceDeviceWidth(width: number) {
  const strip = document.querySelectorAll(
    ".concept-embedded,.concept-panel,.concept-preview-stage,.concept-workspace-main,.concept-workspace-shell,.shell-main,.shell-body,.workspace-project-scope",
  );
  strip.forEach((el) => {
    const e = el as HTMLElement;
    e.style.overflow = "visible";
    e.style.minWidth = "0";
    e.style.maxWidth = "none";
  });
  const device = document.querySelector(".concept-device") as HTMLElement | null;
  if (device) {
    device.style.width = `${width}px`;
    device.style.maxWidth = `${width}px`;
    device.style.minWidth = `${width}px`;
    device.style.overflow = "visible";
  }
}

function measure() {
  const device = document.querySelector(".concept-device") as HTMLElement;
  const hero = document.querySelector(".concept-hero") as HTMLElement;
  const h2 = document.querySelector(".concept-hero-copy h2") as HTMLElement;
  const sub = document.querySelector(".concept-hero-copy > span") as HTMLElement | null;
  const cta = document.querySelector(".concept-hero-actions button") as HTMLElement | null;
  const svc = document.querySelector(
    ".concept-service-cards strong, .concept-service-list strong, .concept-service-columns strong, .concept-service-feature strong",
  ) as HTMLElement | null;
  const cs = getComputedStyle(h2);
  const overflowX = (el: HTMLElement | null) => (el ? el.scrollWidth - el.clientWidth : 0);
  // Число строк — через Range.getClientRects (по одному прямоугольнику на строку-фрагмент). Надёжнее
  // scrollHeight/lineHeight: при line-height:1 кириллица вылезает за строчный бокс и раздувает
  // scrollHeight, из-за чего честные 4 строки мерялись как 5 — артефакт измерения, не композиции.
  const range = document.createRange();
  range.selectNodeContents(h2);
  const h2Lines = range.getClientRects().length;
  return {
    dataHero: hero?.getAttribute("data-hero") ?? "",
    deviceOverflowX: device.scrollWidth - device.clientWidth,
    h2OverflowX: overflowX(h2),
    h2FontPx: parseFloat(cs.fontSize),
    h2Lines,
    hyphens: (cs.hyphens || (cs as unknown as { webkitHyphens?: string }).webkitHyphens) ?? "",
    wordBreak: cs.wordBreak,
    textOverflow: cs.textOverflow,
    subOverflowX: overflowX(sub),
    ctaOverflowX: overflowX(cta),
    svcOverflowX: overflowX(svc),
  };
}

async function renderStress(page: Page, concept: WebsiteConcept, width: number) {
  const id = `stress-${Math.abs(hashCode(concept.businessName + width))}`;
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    ["aevix.projects", JSON.stringify({ version: 1, projects: [seedProject(concept, id)] })],
  );
  await page.goto(`/app/projects/${id}/design`, { waitUntil: "networkidle" });
  await page.waitForSelector(".concept-hero-copy h2", { timeout: 20_000 });
  await page.evaluate(forceDeviceWidth, width);
  // Дать @container и text-wrap: balance переложиться под новую ширину.
  await page.waitForTimeout(250);
  return page.evaluate(measure);
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

test.describe("адаптивная типографика · длинный copy не ломает композицию", () => {
  for (const kase of CASES) {
    for (const width of WIDTHS) {
      test(`${kase.label} · ${width.name} (${width.px}px)`, async ({ page }) => {
        const concept = buildStressConcept(kase);
        const expectedHero = compositionForStyle(kase.styleId).hero;
        const m = await renderStress(page, concept, width.px);

        // Геометрия — та, что задало семейство: тест меряет именно её.
        expect(m.dataHero).toBe(expectedHero);

        // 1. Нет горизонтального переполнения — ни у контейнера, ни у заголовка/подзаголовка/CTA/услуги.
        expect(m.deviceOverflowX, "device horizontal overflow").toBeLessThanOrEqual(1);
        expect(m.h2OverflowX, "H1 horizontal overflow").toBeLessThanOrEqual(1);
        expect(m.subOverflowX, "subtitle horizontal overflow").toBeLessThanOrEqual(1);
        expect(m.ctaOverflowX, "CTA horizontal overflow").toBeLessThanOrEqual(1);
        expect(m.svcOverflowX, "service name horizontal overflow").toBeLessThanOrEqual(1);

        // 2. Никакого дефиса-переноса и агрессивного разрыва латиницы посреди слова.
        expect(m.hyphens, "auto-hyphenation must be off").not.toBe("auto");
        expect(m.wordBreak, "break-all must be off").not.toBe("break-all");

        // 3. Значимый заголовок не обрывается многоточием.
        expect(m.textOverflow, "H1 must not ellipsis").not.toBe("ellipsis");

        // 4. Типографический пол: H1 остаётся H1, а не сжимается в body-текст ради длинного copy.
        expect(m.h2FontPx, "H1 must respect the typography floor").toBeGreaterThanOrEqual(H1_FLOOR_PX);
      });
    }
  }
});

test.describe("адаптивная типографика · перенос намеренный, а не случайный", () => {
  // При copy В ПРЕДЕЛАХ бюджета число строк заголовка не должно превышать максимум семейства:
  // намеренные 2 строки — это композиция, а не потеря контроля.
  const IN_BUDGET: Array<{ styleId: ConceptStyleId; title: string; sub: string }> = [
    { styleId: "editorial", title: "Красота начинается с уверенности", sub: "Бережный уход каждый день." },
    { styleId: "premium", title: "Совершенство в каждой детали", sub: "Забота в каждом прикосновении." },
    { styleId: "brutalist", title: "Характер, выкованный стилем", sub: "Час для себя в атмосфере силы." },
  ];

  for (const item of IN_BUDGET) {
    test(`${item.styleId}: заголовок в пределах строк семейства`, async ({ page }) => {
      const input = validateWebsiteConceptInput({
        businessType: "Другое",
        businessName: "BUDGET",
        styleId: item.styleId,
        colorIds: ["purple"],
        customColors: "",
        goals: ["Показывать услуги", "Вызывать доверие"],
        sections: ["services", "about", "contacts"],
        wishes: "",
      });
      if (!input) throw new Error("invalid input");
      const concept = buildFallbackWebsiteConcept(input);
      concept.pages[0].hero.title = item.title;
      concept.pages[0].hero.subtitle = item.sub;
      const budget = heroCopyBudget(item.styleId);
      const m = await renderStress(page, concept, 1200);
      expect(m.h2Lines, `H1 lines within family max (${budget.lines[1]})`).toBeLessThanOrEqual(budget.lines[1]);
      expect(m.h2Lines).toBeGreaterThanOrEqual(1);
    });
  }
});
