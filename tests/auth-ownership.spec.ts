import { test, expect } from "./support/fixtures";
import { accountsAvailable, deleteAccount, uniqueEmail } from "./support/accounts";
import { createLoginCode } from "../src/lib/auth";

/**
 * Владение адресом: аккаунт принадлежит тому, кто доказал доступ к почте.
 *
 * Пароль, заданный тем, кто владения не доказывал, не должен открывать чужой ящик — ни сразу, ни
 * потом, когда настоящий владелец придёт по коду. Раньше это не проверялось нигде: регистрация
 * заводила рабочий аккаунт на ЛЮБОЙ адрес и сразу выдавала сессию, а вход по коду находил ту же
 * строку — и сажал владельца в аккаунт постороннего.
 *
 * Второй сюжет — код входа как оружие против владельца: неверные вводы засчитывались по адресу, а
 * не по вводящему, поэтому посторонний гасил чужой код, ничего о нём не зная.
 *
 * Нужна настоящая база: проверять владение на подделке хранилища бессмысленно.
 */

test.describe("владение аккаунтом", () => {
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

  test("регистрация чужого адреса не даёт доступа к нему", async ({ page, request }) => {
    const victim = account();

    // Посторонний регистрирует адрес, которым не владеет, со своим паролем.
    const grabbed = await request.post("/api/auth/register", {
      data: { name: "Не владелец", email: victim, password: "zahvat-parol-9", confirm: "zahvat-parol-9" },
    });

    /**
     * Регистрация вправе завести запись и занять адрес — но НЕ вправе выдать доступ: владение
     * почтой ещё никем не доказано. Сессия, выданная здесь, и была захватом: посторонний работал
     * в аккаунте, а настоящий владелец потом входил в него же.
     */
    const cookies = grabbed.headers()["set-cookie"] ?? "";
    expect(cookies, "регистрация не должна выдавать сессию до подтверждения почты").not.toContain(
      "aevix_session=ey",
    );

    // Владелец приходит своим путём — по коду из письма, которое получил только он.
    const code = await createLoginCode(victim);
    const verified = await page.request.post("/api/auth/verify", { data: { email: victim, code } });
    expect(verified.ok(), "владелец обязан войти своим кодом").toBe(true);

    // И теперь пароль постороннего не должен открывать этот аккаунт.
    const withGrabbedPassword = await request.post("/api/auth/password", {
      data: { email: victim, password: "zahvat-parol-9" },
    });
    expect(
      withGrabbedPassword.ok(),
      "пароль, заданный не владельцем, открыл аккаунт после входа владельца",
    ).toBe(false);
  });

  test("посторонний не гасит код, которым владелец ещё не воспользовался", async ({ page, request }) => {
    const victim = account();
    const code = await createLoginCode(victim);

    /**
     * Посторонний знает только адрес — код ему недоступен. Он шлёт мусор: это не догадки о коде,
     * а именно попытки израсходовать чужой лимит. Ровно так чужой код и гасился: счётчик рос у
     * ЖИВОГО кода этой почты, кем бы ни был отправитель.
     */
    for (let i = 0; i < 6; i++) {
      await request.post("/api/auth/verify", { data: { email: victim, code: "не-код" } });
    }

    const mine = await page.request.post("/api/auth/verify", { data: { email: victim, code } });
    expect(
      mine.ok(),
      "код владельца сгорел от чужих попыток — вход отобран у того, кто владеет почтой",
    ).toBe(true);
  });

  test("перебор кода по-прежнему невозможен", async ({ request }) => {
    const victim = account();
    await createLoginCode(victim);

    // Защита от перебора обязана остаться: шесть цифр — миллион значений, и без ограничения
    // попыток замена ссылки на код была бы ослаблением, а не усилением.
    const attempts: number[] = [];
    for (let i = 0; i < 8; i++) {
      const guess = String(100000 + i);
      const response = await request.post("/api/auth/verify", { data: { email: victim, code: guess } });
      attempts.push(response.status());
    }
    expect(attempts.every((status) => status !== 200), "неверный код не должен пускать").toBe(true);

    const body = await (
      await request.post("/api/auth/verify", { data: { email: victim, code: "111111" } })
    ).json();
    expect(
      body.reason,
      "после серии неверных догадок код обязан быть исчерпан, а не принимать догадки бесконечно",
    ).toBe("attempts");
  });
});
