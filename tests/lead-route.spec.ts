import { test, expect } from "@playwright/test";

/**
 * Lead API — контроль конфигурации доставки (post-release pass 1, hardening).
 *
 * LEADS_TO_EMAIL — обязательная server-side переменная. Без неё письмо НЕ отправляется (никакого
 * скрытого фолбэка на личный адрес), endpoint возвращает контролируемый config-failure, а клиент
 * показывает обычный честный error-state (success не показывается).
 */

test("LEADS_TO_EMAIL missing → 503, письмо не отправляется, success недоступен", async () => {
  const prevTo = process.env.LEADS_TO_EMAIL;
  const prevKey = process.env.RESEND_API_KEY;
  // Ключ есть, получателя НЕТ — изолируем именно проверку LEADS_TO_EMAIL.
  delete process.env.LEADS_TO_EMAIL;
  process.env.RESEND_API_KEY = "test-key-not-used";
  try {
    const { POST } = await import("../src/app/api/lead/route");
    const request = new Request("http://localhost/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Иван", contact: "@ivan" }),
    });
    const response = await POST(request);
    // Контролируемый config-failure — не 200/успех.
    expect(response.status).toBe(503);
    const body = (await response.json()) as { ok?: boolean; error?: string };
    // success НЕ показывается: нет ok, есть человекочитаемая ошибка.
    expect(body.ok).toBeUndefined();
    expect(body.error).toBeTruthy();
  } finally {
    if (prevTo === undefined) delete process.env.LEADS_TO_EMAIL;
    else process.env.LEADS_TO_EMAIL = prevTo;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  }
});
