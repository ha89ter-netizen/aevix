import { NextResponse } from "next/server";
import { consumeLoginToken, isAuthConfigured, sessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Переход по ссылке из письма: гасит одноразовый токен, выдаёт сессию и уводит в Workspace.
 *
 * Отвечает редиректом, а не JSON: сюда попадают из почтового клиента, то есть обычной
 * навигацией в адресной строке, и человек должен оказаться в приложении, а не смотреть на
 * машинный ответ.
 *
 * Ошибка тоже ведёт на страницу входа, а не показывает голый текст: истёкшая ссылка — самый
 * частый исход из всех неуспешных, и человеку нужна форма, чтобы запросить новую, а не
 * сообщение о том, что всё плохо.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const loginUrl = new URL("/app/login", url.origin);

  if (!isAuthConfigured()) {
    loginUrl.searchParams.set("error", "unavailable");
    return NextResponse.redirect(loginUrl);
  }

  const result = await consumeLoginToken(url.searchParams.get("token"));

  if (!result.ok) {
    loginUrl.searchParams.set("error", result.reason);
    return NextResponse.redirect(loginUrl);
  }

  // `migrate=1` — сигнал клиенту предложить перенос проектов, лежащих в этом браузере. Сам
  // перенос делает приложение: только у него есть доступ к localStorage.
  const target = new URL("/app/projects", url.origin);
  target.searchParams.set("migrate", "1");

  const response = NextResponse.redirect(target);
  response.cookies.set(sessionCookie(result.user));
  return response;
}
