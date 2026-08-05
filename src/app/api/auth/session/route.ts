import { NextResponse } from "next/server";
import { currentUser, expiredSessionCookie, getProfile, isAuthConfigured } from "@/lib/auth";

export const runtime = "nodejs";

/** Кто сейчас вошёл. Единственный источник правды для интерфейса — клиент не разбирает cookie
 * сам, она httpOnly и ему не видна.
 *
 * `?profile=1` добавляет то, чего нет в сессии: дату создания аккаунта и признак заданного
 * пароля. Отдельным запросом, а не всегда: страницам, которым нужен только факт входа, лишний
 * поход в базу ни к чему. */
export async function GET(request: Request) {
  const user = currentUser(request);
  const wantsProfile = new URL(request.url).searchParams.get("profile") === "1";

  return NextResponse.json({
    user,
    profile: wantsProfile && user ? await getProfile(user.id) : undefined,
    // Позволяет интерфейсу не предлагать вход там, где он заведомо не заработает.
    available: isAuthConfigured(),
  });
}

/** Выход. Гасит cookie; ничего не удаляя ни в базе, ни в браузере. */
export async function DELETE() {
  const response = NextResponse.json({ user: null });
  response.cookies.set(expiredSessionCookie());
  return response;
}
