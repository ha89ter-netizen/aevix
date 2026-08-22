import { test, expect } from "@playwright/test";
import {
  PROCESS_STAGE_TYPES,
  captionFor,
  classifyStage,
  describeProcess,
  normalizeStageTitle,
  processPrinciples,
  stageWidths,
} from "../src/lib/process-illustrations";

/**
 * Семантическая система иллюстраций «Процесса» — обычным тестом, без браузера.
 *
 * Проверяет не пиксели, а СВОЙСТВА системы: классификация детерминирована и осмысленна, раскладка
 * не оставляет сироту при любой длине, подпись не пересказывает заголовок, а принципы «Почему
 * именно так» выводятся из состава процесса. Ровно то, что должно сломаться, если Process снова
 * станет «одна история с заменой существительных».
 */

test.describe("процесс · семантическая классификация", () => {
  test("детерминирована: один шаг — один тип, всегда тот же", () => {
    for (const step of ["Клиент пишет", "Оплата принята", "Готовится документ"]) {
      expect(classifyStage(step)).toBe(classifyStage(step));
    }
  });

  test("узнаёт разные типы по смыслу, а не сваливает всё в один", () => {
    const cases: Array<[string, string]> = [
      ["Клиент пишет в WhatsApp", "message"],
      ["Оплата принята", "payment"],
      ["Готовится документ", "document"],
      ["Проверяется наличие товара", "inventory"],
      ["Клиент получает подтверждение", "notification"],
      ["Клиент оставляет отзыв", "review"],
      ["Работа передаётся мастеру", "handoff"],
    ];
    for (const [step, type] of cases) {
      expect(classifyStage(step), `«${step}» → ${type}`).toBe(type);
    }
  });

  test("реальный процесс даёт РАЗНЫЕ типы, а не один шаблон", () => {
    const salon = ["Клиент пишет в WhatsApp", "Запрос разобран на детали", "Проверяется расписание", "Создаётся запись", "Клиент получает подтверждение"];
    const types = new Set(salon.map(classifyStage));
    // Минимум четыре различимых сцены в пяти шагах — иначе это снова одна иллюстрация с иконкой.
    expect(types.size).toBeGreaterThanOrEqual(4);
  });

  test("каждый семантический тип имеет короткую подпись-подтверждение", () => {
    for (const type of PROCESS_STAGE_TYPES) {
      const caption = captionFor(type);
      expect(caption.trim().length).toBeGreaterThan(0);
      // Подпись «подтверждает» — короткая (до 3 слов), не абзац.
      expect(caption.trim().split(/\s+/).length).toBeLessThanOrEqual(3);
    }
  });
});

test.describe("процесс · без дублирования", () => {
  test("подпись не повторяет заголовок шага", () => {
    const steps = ["Клиент пишет", "Проверяется расписание", "Создаётся запись", "Клиент получает подтверждение"];
    for (const stage of describeProcess(steps)) {
      expect(stage.caption).not.toBe(stage.title);
      expect(stage.caption.toLowerCase()).not.toBe(stage.title.toLowerCase());
    }
  });

  test("принципы «Почему» выводятся из состава процесса и не одинаковы для всех", () => {
    const withPayment = processPrinciples(["Гость делает заказ", "Оплата принята", "Заказ уходит на кухню"]);
    const withoutPayment = processPrinciples(["Клиент пишет", "Проверяется расписание", "Создаётся запись"]);
    expect(withPayment.length).toBeGreaterThanOrEqual(2);
    expect(withPayment.length).toBeLessThanOrEqual(3);
    // Процесс с оплатой называет денежный принцип; процесс без неё — нет. Разные истории → разный финал.
    expect(withPayment.some((p) => p.key === "money")).toBe(true);
    expect(withoutPayment.some((p) => p.key === "money")).toBe(false);
  });
});

test.describe("процесс · нормализация заголовков", () => {
  test("схлопывает пробелы и снимает завершающую пунктуацию, не обрезая значимый текст", () => {
    expect(normalizeStageTitle("  Клиент   пишет.  ")).toBe("Клиент пишет");
    expect(normalizeStageTitle("Создаётся запись:")).toBe("Создаётся запись");
    // Не режет многоточием — длинный текст остаётся целым, перенос делает вёрстка.
    const long = "Клиент оставляет заявку через сайт или мессенджер";
    expect(normalizeStageTitle(long)).toBe(long);
  });
});

test.describe("процесс · динамическая длина без сироты", () => {
  for (const n of [3, 4, 5, 6, 7, 10]) {
    test(`${n} этапов: раскладка намеренная, без карточки-сироты`, () => {
      const widths = stageWidths(n);
      expect(widths).toHaveLength(n);
      // Первая карточка — всегда ведущая (во всю ширину): вход в историю.
      expect(widths[0]).toBe(true);
      // Ключевой инвариант: половинных карточек чётное число — ни одна не висит одна в ряду.
      const halfCount = widths.filter((w) => !w).length;
      expect(halfCount % 2, `половинных карточек чётное число при ${n} этапах`).toBe(0);
    });
  }

  test("вырожденные длины не падают", () => {
    expect(stageWidths(0)).toEqual([]);
    expect(stageWidths(1)).toEqual([true]);
  });
});
