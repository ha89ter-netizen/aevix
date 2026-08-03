import { test, expect } from "@playwright/test";

/**
 * Живые AI-маршруты, против настоящего OpenAI.
 *
 * Зачем это существует. Все три маршрута при любой неудаче молча уходят на локальный запасной
 * путь: концепт возвращается с `source: "fallback"`, намерение — как `intent: null`. Свойство
 * ценное — проект никогда не открывается пустым, — но у него есть цена: сломанный AI-путь
 * выглядит для пользователя ровно как работающий. Так и случилось однажды: `verbosity: "low"`
 * отвергалась моделью с 400, и понимание свободного текста не работало в проде вообще, а
 * заметил это только первый запуск с настоящим ключом.
 *
 * Отсюда главный приём набора: проверяется НЕ то, что ответ пришёл, а что он пришёл ОТ МОДЕЛИ —
 * `source: "ai"`. Проверка «ответ не пустой» была бы зелёной и при полностью мёртвом ключе.
 *
 * И проверяется форма, а не слова. Утверждать, что модель написала конкретную фразу, — значит
 * завести тест, который краснеет от смены версии модели, ничего не сообщая о нашем коде.
 *
 * Основной набор эти маршруты мокает и остаётся быстрым; здесь всё наоборот. См.
 * playwright.live.config.ts.
 */

test.describe("живые AI-маршруты", () => {
  test.skip(!process.env.OPENAI_API_KEY, "нужен настоящий OPENAI_API_KEY — см. .env.example");

  test("бизнес-анализ возвращает разбор, прошедший проверку схемы", async ({ request }) => {
    const response = await request.post("/api/business-analysis", {
      data: { message: "Барбершоп на три кресла в Алматы, запись ведём вручную в тетради" },
    });

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { result?: Record<string, unknown>; error?: string };
    // 503 означал бы «ключа нет», 502 — «модель ответила не по схеме». Оба здесь провал.
    expect(body.error, "маршрут ответил ошибкой вместо разбора").toBeUndefined();

    const result = body.result;
    expect(result, "ответ без result").toBeTruthy();
    // Форма целиком: маршрут отдаёт result только после собственной валидации, поэтому
    // недостающее поле означает, что валидация разошлась со схемой запроса.
    for (const field of ["shortAnswer", "recommendedSolution", "summary", "callToAction"]) {
      expect(typeof result![field], `поле ${field}`).toBe("string");
      expect((result![field] as string).length, `поле ${field} пустое`).toBeGreaterThan(0);
    }
    for (const field of ["reasons", "problems", "recommendations", "flow"]) {
      expect(Array.isArray(result![field]), `поле ${field}`).toBe(true);
      expect((result![field] as unknown[]).length, `поле ${field} пустое`).toBeGreaterThan(0);
    }
  });

  test("концепт сайта приходит от модели, а не из запасного пути", async ({ request }) => {
    const ask = () =>
      request.post("/api/website-concept", {
        data: {
          businessType: "Барбершоп",
          businessName: "FORMA",
          styleIds: ["minimal"],
          styleId: "minimal",
          colorIds: ["black", "gold"],
          customColors: "",
          goals: ["Получать заявки"],
          sections: ["services", "pricing", "about", "gallery", "reviews", "booking", "contacts", "faq"],
          wishes: "Спокойный сайт с записью и ценами",
        },
      });

    /**
     * Несколько попыток, и это не смягчение проверки, а признание природы предмета.
     *
     * Маршрут требует от модели полный набор обязательных секций (services, about, contacts и
     * pricing) и при нехватке любой из них молча отдаёт локальный концепт. Модель выполняет это
     * требование не всегда — на первом же прогоне этого набора она сорвалась примерно в
     * половине случаев. Одна попытка проверяла бы удачу, а не работоспособность пути.
     *
     * Что проверяется: AI-путь ЖИВ, то есть хотя бы одна попытка доходит до модели и проходит
     * наши требования. Если мёртв ключ или сломан запрос, откатятся все три, и тест покраснеет.
     */
    const notices: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await ask();
      expect(response.status()).toBe(200);
      const body = (await response.json()) as { source?: string; notice?: string; concept?: { pages?: unknown[] } };

      if (body.source === "ai") {
        expect(Array.isArray(body.concept?.pages)).toBe(true);
        expect(body.concept!.pages!.length).toBeGreaterThan(0);
        return;
      }
      notices.push(`попытка ${attempt}: ${body.notice ?? "без пояснения"}`);
    }

    throw new Error(`AI-концепт не получен ни разу за три попытки.\n${notices.join("\n")}`);
  });

  test("AI-дизайнер понимает формулировку, которую локальный разбор не берёт", async ({ request }) => {
    // Важно, что фраза без ключевых слов: «дороже» не встречается ни в одном правиле
    // resolveIntent, поэтому локальный путь вернёт unknown и запрос дойдёт до модели. С
    // фразой вроде «убери отзывы» тест был бы зелёным и при мёртвом ключе.
    const response = await request.post("/api/designer-intent", {
      data: {
        request: "хочу чтобы сайт выглядел дороже",
        offers: ["Мужская стрижка", "Стрижка + борода"],
        sections: ["services", "reviews", "faq"],
      },
    });

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { intent?: { id?: string } | null; source?: string };

    expect(body.source, "намерение не от модели — путь свободного текста мёртв").toBe("ai");
    expect(body.intent?.id, "модель не поставила намерение").toBeTruthy();
    expect(body.intent!.id).not.toBe("unknown");
  });

  test("бессмыслица не превращается в выдуманную правку", async ({ request }) => {
    // Обратная сторона предыдущего: модель обязана уметь отвечать «не понял». Если она на
    // любой ввод возвращает какое-нибудь намерение, AI-дизайнер начнёт молча менять проект
    // от случайного текста — а это правки чужой работы.
    //
    // Честная оговорка: в одиночку эта проверка ничего не стоит. Маршрут отвечает `intent: null`
    // и когда модель отказалась, и когда ключа нет вовсе, так что с мёртвым ключом тест зелёный.
    // Смысл он имеет только рядом с проверками выше — они краснеют первыми (проверено: с
    // заведомо неверным ключом падают три из четырёх, а зелёным остаётся именно этот).
    const response = await request.post("/api/designer-intent", {
      data: { request: "асдфгх йцукен ??", offers: [], sections: [] },
    });

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { intent?: { id?: string } | null };
    expect(body.intent, "на бессмыслицу выдано намерение").toBeNull();
  });
});
