import { test, expect } from "@playwright/test";
import {
  MIN_CONCEPT_SECTIONS,
  buildFallbackWebsiteConcept,
  validateWebsiteConceptInput,
  type ConceptGoal,
} from "../src/lib/website-concept";
import { recommendStructure } from "../src/lib/project-structure";
import {
  generationStages,
  runProjectGeneration,
  type GenerationStageId,
  type ProjectBrief,
} from "../src/lib/project-generation";

/**
 * Фазы генерации обязаны совпадать с настоящими границами жизненного цикла.
 *
 * Дефект, ради которого написан этот файл: подписей было восемь, а время занимали ДВЕ —
 * единственные два сетевых шага. Остальные шесть синхронные и проскакивали одним кадром в самом
 * конце. На живом замере активная строка менялась дважды за 16–50 секунд, после чего шесть
 * галочек ставились разом: список честно перечислял, что делает код, но врал о том, сколько это
 * стоит по времени.
 *
 * Проверка идёт не по списку подписей, а по тому, КОГДА фаза объявлена относительно ответов
 * сети. Восемь прежних этапов её не прошли бы: пять из них объявлялись после последнего `await`.
 */

const BRIEF: ProjectBrief = {
  name: "Барбершоп Тест",
  businessType: "Барбершоп",
  city: "Алматы",
  description: "Барбершоп на три мастера, запись вручную",
  styleIds: [],
  colorIds: [],
  goals: [],
  sections: [],
  wishes: "",
};

type Recorded = { id: GenerationStageId; at: number };

/**
 * Прогоняет генерацию на подставном `fetch`, который отвечает не сразу. Задержка нужна не для
 * скорости, а чтобы у фаз появился измеримый порядок относительно двух ожиданий.
 */
async function runWithStubbedNetwork(delayMs: number) {
  const original = globalThis.fetch;
  const calls: string[] = [];
  const stages: Recorded[] = [];
  const startedAt = Date.now();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    // Пустой ответ: оба маршрута умеют работать без ключа, и генерация уходит в локальный
    // запасной путь. Нас интересует ПОРЯДОК фаз, а не содержимое ответа.
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const result = await runProjectGeneration(
      BRIEF,
      (id) => stages.push({ id, at: Date.now() - startedAt }),
      new AbortController().signal,
    );
    return { stages, calls, result };
  } finally {
    globalThis.fetch = original;
  }
}

test.describe("генерация · фазы соответствуют тому, что система реально наблюдает", () => {
  test("объявлены ровно те фазы, что перечислены, и в том же порядке", async () => {
    const { stages } = await runWithStubbedNetwork(60);
    expect(stages.map((stage) => stage.id)).toEqual(generationStages.map((stage) => stage.id));
  });

  test("каждая фаза — настоящая граница: две относятся к ожиданиям сети, третья к сборке", async () => {
    const DELAY = 400;
    const { stages, calls } = await runWithStubbedNetwork(DELAY);

    // Ровно два сетевых шага — больше система наблюдать нечего.
    expect(calls.filter((url) => url.includes("/api/business-analysis"))).toHaveLength(1);
    expect(calls.filter((url) => url.includes("/api/website-concept"))).toHaveLength(1);

    const at = (id: GenerationStageId) => stages.find((stage) => stage.id === id)!.at;

    // Первая фаза объявлена до первого ожидания.
    expect(at("analyze")).toBeLessThan(DELAY);
    // Вторая — после первого ответа, то есть за ней стоит настоящее ожидание.
    expect(at("concept")).toBeGreaterThanOrEqual(DELAY);
    // Третья — после обоих ответов.
    expect(at("assemble")).toBeGreaterThanOrEqual(DELAY * 2);
  });

  test("ни одна фаза не проскакивает вместе с предыдущей", async () => {
    // Прежние восемь этапов проваливались именно здесь: пять из них объявлялись подряд, в один
    // тик, уже после последнего ответа сети. Порог намеренно ниже задержки — проверяется не
    // скорость, а то, что между фазами вообще что-то происходит.
    const DELAY = 300;
    const { stages } = await runWithStubbedNetwork(DELAY);
    for (let i = 1; i < stages.length; i++) {
      const gap = stages[i].at - stages[i - 1].at;
      expect(gap, `${stages[i - 1].id} → ${stages[i].id} прошли за ${gap}мс`).toBeGreaterThan(DELAY / 2);
    }
  });

  test("у каждой фазы своя подпись и своё объяснение — без выдуманных процентов", async () => {
    const labels = generationStages.map((stage) => stage.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const stage of generationStages) {
      expect(stage.hint.trim().length, stage.id).toBeGreaterThan(0);
      // Ожидание зависит от чужого сервиса: любое число здесь было бы выдумано.
      expect(`${stage.label} ${stage.hint}`).not.toMatch(/\d+\s*%|процент|осталось \d/i);
    }
  });

  test("генерация всё равно возвращает полный проект, когда сеть отвечает пусто", async () => {
    // Запасной путь — принятый инвариант: проект не открывается пустым. Фазы его не отменяют.
    const { result } = await runWithStubbedNetwork(20);
    expect(result.analysis).toBeTruthy();
    expect(result.design).toBeTruthy();
    expect(result.pricing).toBeTruthy();
  });
});

/**
 * Минимальный состав структуры — один контракт на обе стороны.
 *
 * Дефект, найденный живым обходом: мастер отпускал бриф с одним-двумя разделами
 * (`canSubmit` смотрел только на `length > 0`), а маршрут генерации требовал трёх. Действие,
 * которое интерфейс считал допустимым, получало 400, и человек молча получал локальный концепт
 * вместо AI-концепта — ни отказа, ни объяснения.
 *
 * Проверки ниже стерегут именно рассинхрон: обе стороны обязаны читать одно число.
 */
test.describe("структура концепта · минимум один на клиент и сервер", () => {
  const VALID = {
    businessType: "Барбершоп",
    businessName: "FORMA",
    styleId: "minimal",
    colorIds: ["black"],
    customColors: "",
    goals: ["Получать заявки"],
    wishes: "",
    city: "Алматы",
  };
  const TYPES = ["services", "pricing", "about", "gallery", "contacts"] as const;
  const withSections = (n: number) => ({ ...VALID, sections: TYPES.slice(0, n) });

  test("ниже минимума серверная проверка отказывает", () => {
    for (let n = 0; n < MIN_CONCEPT_SECTIONS; n++) {
      expect(validateWebsiteConceptInput(withSections(n)), `${n} разделов`).toBeNull();
    }
  });

  test("ровно минимум проходит, и лишнее не отбрасывается", () => {
    const exact = validateWebsiteConceptInput(withSections(MIN_CONCEPT_SECTIONS));
    expect(exact).not.toBeNull();
    expect(exact!.sections).toHaveLength(MIN_CONCEPT_SECTIONS);

    const more = validateWebsiteConceptInput(withSections(MIN_CONCEPT_SECTIONS + 2));
    expect(more).not.toBeNull();
    expect(more!.sections).toHaveLength(MIN_CONCEPT_SECTIONS + 2);
  });

  test("минимум — осмысленное число, а не порог валидатора", () => {
    // Три — это «что предлагаем · кто мы · как связаться». Меньше двух сайт не описывает, а
    // выше пяти ограничение перестало бы быть минимумом и резало бы обычные структуры:
    // предложение мастера никогда не бывает короче пяти разделов.
    expect(MIN_CONCEPT_SECTIONS).toBeGreaterThanOrEqual(2);
    expect(MIN_CONCEPT_SECTIONS).toBeLessThanOrEqual(5);
  });

  test("любая структура, предложенная мастером, проходит серверную проверку", () => {
    // Настоящий сторож рассинхрона: то, что интерфейс показывает человеку по умолчанию, сервер
    // обязан принимать. Ниши и цели берутся разные — одна проверенная пара ничего не доказала бы.
    const cases: Array<[string, ConceptGoal[]]> = [
      ["Барбершоп", ["Записывать клиентов"]],
      ["Кофейня", ["Продавать товары"]],
      ["Юрист", ["Получать заявки"]],
      ["Клиника", ["Вызывать доверие"]],
      ["Автосервис", ["Показывать услуги"]],
    ];
    for (const [businessType, goals] of cases) {
      const structure = recommendStructure(businessType, "Тест", goals);
      expect(structure.length, `${businessType}: ${structure.length} разделов`).toBeGreaterThanOrEqual(
        MIN_CONCEPT_SECTIONS,
      );
      const input = validateWebsiteConceptInput({
        ...VALID,
        businessType: "Барбершоп",
        goals,
        sections: structure.map((section) => section.type),
      });
      expect(input, `${businessType}: структура мастера отвергнута сервером`).not.toBeNull();
    }
  });

  test("валидная структура даёт настоящий концепт, а не подмену из-за счёта разделов", () => {
    // Если бы стороны снова разошлись, здесь бы вернулся null — и человек получил бы локальный
    // концепт при формально верном брифе.
    const input = validateWebsiteConceptInput(withSections(MIN_CONCEPT_SECTIONS));
    expect(input).not.toBeNull();
    const concept = buildFallbackWebsiteConcept(input!);
    expect(concept.pages.length).toBeGreaterThan(0);
    for (const page of concept.pages) expect(page.sections.length).toBeGreaterThan(0);
  });
});

/**
 * Всё, что мастер отправляет, сервер обязан принимать.
 *
 * Проверка стоит на самом верхнем уровне: берётся тело настоящего запроса, собранного
 * генерацией из брифа, и прогоняется через ТУ ЖЕ серверную проверку. Так ловится любой
 * рассинхрон полей, а не только тот, который вспомнили, — счёт разделов был лишь одним из них.
 * Второй, найденный этим же обходом, крупнее: ниша уходила ярлыком канонического резолвера
 * («Автосервис», «Клиника»), а вход принимал только семь подписей фишек мастера, и любой бизнес
 * вне этой семёрки молча получал локальный концепт вместо AI-концепта.
 */
test.describe("бриф мастера · сервер принимает то, что интерфейс отправляет", () => {
  async function captureConceptRequest(brief: ProjectBrief) {
    const original = globalThis.fetch;
    let body: unknown = null;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/website-concept")) body = JSON.parse(String(init?.body ?? "{}"));
      return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    try {
      await runProjectGeneration(brief, () => {}, new AbortController().signal);
    } finally {
      globalThis.fetch = original;
    }
    return body;
  }

  const briefFor = (over: Partial<ProjectBrief>): ProjectBrief => ({
    name: "Тест",
    businessType: "",
    city: "Алматы",
    description: "",
    styleIds: [],
    colorIds: [],
    goals: ["Получать заявки"],
    sections: [],
    wishes: "",
    ...over,
  });

  const CASES: Array<[string, Partial<ProjectBrief>]> = [
    // Ниши вне семи подписей мастера — именно они и отвергались.
    ["автосервис", { name: "Гараж", businessType: "Автосервис" }],
    ["клиника", { name: "Клиника Плюс", businessType: "Клиника" }],
    ["юрист", { name: "Право", businessType: "Юрист" }],
    // Подпись из словаря мастера — работала и раньше, служит контролем.
    ["барбершоп", { name: "FORMA", businessType: "Барбершоп" }],
    // Нераспознанный бизнес: ниша пустая, и подставиться обязано что-то непустое.
    ["нераспознанный", { name: "Что-то своё", businessType: "" }],
    // Структура ровно на минимуме — вторая половина контракта.
    [
      "минимальная структура",
      {
        name: "FORMA",
        businessType: "Барбершоп",
        sections: [
          { type: "services", title: "Услуги" },
          { type: "about", title: "О компании" },
          { type: "contacts", title: "Контакты" },
        ],
      },
    ],
  ];

  for (const [label, over] of CASES) {
    test(`${label}: запрос мастера проходит серверную проверку`, async () => {
      const body = await captureConceptRequest(briefFor(over));
      expect(body, "запрос концепта не был отправлен").not.toBeNull();
      const validated = validateWebsiteConceptInput(body);
      expect(validated, `сервер отверг бы бриф «${label}»`).not.toBeNull();
      expect(validated!.businessType.trim().length).toBeGreaterThan(0);
      expect(validated!.sections.length).toBeGreaterThanOrEqual(MIN_CONCEPT_SECTIONS);
    });
  }

  test("пустая ниша по-прежнему отвергается — проверка не стала бесполезной", () => {
    // Расширение контракта не должно означать «принимаем что угодно»: пустое и слишком длинное
    // остаются отказом, иначе тесты выше были бы зелёными при полностью снятой проверке.
    const valid = {
      businessType: "Автосервис",
      businessName: "Гараж",
      styleId: "minimal",
      colorIds: ["black"],
      customColors: "",
      goals: ["Получать заявки"],
      wishes: "",
      sections: ["services", "about", "contacts"],
    };
    expect(validateWebsiteConceptInput(valid)).not.toBeNull();
    expect(validateWebsiteConceptInput({ ...valid, businessType: "" })).toBeNull();
    expect(validateWebsiteConceptInput({ ...valid, businessType: "  " })).toBeNull();
    expect(validateWebsiteConceptInput({ ...valid, businessType: "х".repeat(200) })).toBeNull();
    expect(validateWebsiteConceptInput({ ...valid, businessType: 42 })).toBeNull();
  });
});
