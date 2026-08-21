import { test, expect } from "@playwright/test";
import { conceptStyles } from "../src/lib/website-concept";
import {
  COMPOSITION_FAMILIES,
  FAMILY_COMPOSITION,
  HERO_COPY_BUDGET,
  compositionDescriptor,
  compositionForStyle,
  describeCopyBudget,
  familyForStyle,
  heroCopyBudget,
  type ConceptLang,
} from "../src/lib/concept-composition";

/**
 * Реальное разнообразие композиции — обычным тестом, без браузера и без computer vision.
 *
 * Тест сравнивает не пиксели, а КОМПОЗИЦИОННЫЕ ДЕСКРИПТОРЫ (семейство/hero/услуги/фото/ритм).
 * Дескриптор нарочно не включает цвет и радиус: если различие стилей держится только на них, тест
 * должен это поймать — ровно та болезнь, которую этап 3 лечит. Он и есть автоматическая защита от
 * «одна страница + другой CSS».
 */

test.describe("композиция · разнообразие", () => {
  test("каждое семейство даёт уникальную геометрию", () => {
    // Пять семейств — пять разных дескрипторов. Если два семейства совпали, одно лишнее.
    const descriptors = COMPOSITION_FAMILIES.map((family) => {
      const c = FAMILY_COMPOSITION[family];
      return [c.hero, c.services, c.images, c.rhythm].join("/");
    });
    expect(new Set(descriptors).size).toBe(COMPOSITION_FAMILIES.length);
  });

  test("стили не сводятся к одной композиции: минимум четыре различимых дескриптора", () => {
    // Критерий пользователя: убери цвет и радиус — стили должны остаться различимы. Тринадцать
    // стилей группируются в семейства, но семейств несколько, и среди тринадцати обязано быть
    // хотя бы четыре РАЗНЫХ дескриптора — иначе это снова один шаблон с токенами.
    const descriptors = conceptStyles.map((s) => compositionDescriptor(s.id));
    const unique = new Set(descriptors);
    expect(unique.size).toBeGreaterThanOrEqual(4);
  });

  test("каждое семейство используется хотя бы одним стилем — мёртвых семейств нет", () => {
    const used = new Set(conceptStyles.map((s) => familyForStyle(s.id)));
    for (const family of COMPOSITION_FAMILIES) {
      expect(used.has(family), `семейство ${family} не использует ни один стиль`).toBe(true);
    }
  });

  test("стили одного семейства делят геометрию, но остаются разными стилями", () => {
    // editorial и bold — одно семейство (одна геометрия). Это допустимо: их РАЗЛИЧАЮТ токены
    // (вес, трекинг, тень). Проверяется, что геометрия у них действительно общая — семейство не
    // ветвится незаметно.
    expect(compositionDescriptor("editorial")).toBe(compositionDescriptor("bold"));
    expect(familyForStyle("glass")).toBe(familyForStyle("luxury"));
    // А между семействами дескриптор обязан отличаться.
    expect(compositionDescriptor("editorial")).not.toBe(compositionDescriptor("brutalist"));
    expect(compositionDescriptor("glass")).not.toBe(compositionDescriptor("premium"));
  });

  test("hero-геометрии покрывают разные типы, а не один split на всех", () => {
    // Прежний баг: все стили были text-left/image-right. Теперь среди семейств должно быть
    // минимум четыре разных hero.
    const heroes = new Set(COMPOSITION_FAMILIES.map((f) => FAMILY_COMPOSITION[f].hero));
    expect(heroes.size).toBeGreaterThanOrEqual(4);
  });

  test("четырнадцатый стиль собирается из примитивов, не копируя страницу", () => {
    // Проверка обещания архитектуры: новый стиль — это комбинация (семейство + токены), а не
    // новый шаблон. Смоделируем: стиль, отданный любому существующему семейству, немедленно
    // получает его полную геометрию без единой новой строки разметки.
    for (const family of COMPOSITION_FAMILIES) {
      const c = FAMILY_COMPOSITION[family];
      expect(c.hero).toBeTruthy();
      expect(c.services).toBeTruthy();
      // Геометрия полностью описана данными — значит новый стиль подключается одной записью в
      // STYLE_FAMILY, без нового компонента.
      expect(["framed", "full-bleed", "editorial-crop", "accent", "grid"]).toContain(c.images);
    }
  });

  test("compositionForStyle детерминирован и полон для всех стилей", () => {
    for (const style of conceptStyles) {
      const c = compositionForStyle(style.id);
      expect(c.homeServiceCount).toBeGreaterThanOrEqual(3);
      expect(c.homeServiceCount).toBeLessThanOrEqual(4);
      // Дважды — одинаково: композиция не зависит от случайности.
      expect(compositionForStyle(style.id)).toEqual(c);
    }
  });
});

test.describe("бюджет типографики · copy и layout договариваются", () => {
  const LANGS: ConceptLang[] = ["ru", "en", "kk"];

  test("у каждого типа hero есть осмысленный бюджет заголовка", () => {
    // Каждая hero-геометрия обязана иметь бюджет: без него генерация снова «напиши красивый
    // заголовок» — то есть наугад, без связи с композицией.
    for (const kind of Object.keys(FAMILY_COMPOSITION).map((f) => FAMILY_COMPOSITION[f as keyof typeof FAMILY_COMPOSITION].hero)) {
      const b = HERO_COPY_BUDGET[kind];
      expect(b, `нет бюджета для hero ${kind}`).toBeTruthy();
      // Диапазон слов возрастающий и разумный (короткий ударный H1, не абзац).
      expect(b.words[0]).toBeGreaterThanOrEqual(2);
      expect(b.words[1]).toBeGreaterThan(b.words[0]);
      expect(b.words[1]).toBeLessThanOrEqual(9);
      // Намеренные 2 строки — норма; узкие редакционные/технические столбцы (overlap/canvas)
      // допускают до 4 (пользователь прямо разрешает Hero H1 в 2–4 строки по семейству). Больше
      // четырёх — это уже не заголовок.
      expect(b.lines[0]).toBeGreaterThanOrEqual(1);
      expect(b.lines[1]).toBeGreaterThanOrEqual(b.lines[0]);
      expect(b.lines[1]).toBeLessThanOrEqual(4);
    }
  });

  test("предел символов задан отдельно для RU/EN/KZ, а не один на всех", () => {
    // Требование пользователя: один character limit на три языка нельзя — визуальная длина слов
    // различается. Проверяем, что языки действительно разведены, а не скопированы.
    for (const kind of Object.keys(HERO_COPY_BUDGET) as (keyof typeof HERO_COPY_BUDGET)[]) {
      const { chars } = HERO_COPY_BUDGET[kind];
      for (const lang of LANGS) {
        expect(chars[lang]).toBeGreaterThan(24);
        expect(chars[lang]).toBeLessThan(80);
      }
      // KZ агглютинативен (слова длиннее) — при той же ширине помещается меньше символов, чем EN.
      expect(chars.kk).toBeLessThan(chars.en);
    }
  });

  test("heroCopyBudget и describeCopyBudget детерминированы и включают числа бюджета", () => {
    for (const style of conceptStyles) {
      const budget = heroCopyBudget(style.id);
      expect(heroCopyBudget(style.id)).toEqual(budget);
      const text = describeCopyBudget(style.id, "ru");
      // Промпт должен нести конкретику — слова и символы, а не общие слова «красиво».
      expect(text).toContain(`${budget.words[0]}–${budget.words[1]} слов`);
      expect(text).toContain(`${budget.chars.ru} символов`);
      expect(text).toContain("без искусственных дефисов");
    }
  });

  test("бюджет меняется по семейству: не одна композиция на всё", () => {
    // overlap/canvas (тесная мера) строже split (широкая колонка) — иначе бюджет ничего не решает.
    expect(HERO_COPY_BUDGET.overlap.chars.ru).toBeLessThan(HERO_COPY_BUDGET.split.chars.ru);
    expect(HERO_COPY_BUDGET.canvas.words[1]).toBeLessThan(HERO_COPY_BUDGET.split.words[1]);
  });
});
