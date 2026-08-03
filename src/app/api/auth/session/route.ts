import { NextResponse } from "next/server";
import { currentUser, expiredSessionCookie, isAuthConfigured } from "@/lib/auth";

export const runtime = "nodejs";

/** Кто сейчас вошёл. Единственный источник правды для интерфейса — клиент не разбирает cookie
 * сам, она httpOnly и ему не видна. */
export async function GET(request: Request) {
  return NextResponse.json({
    user: currentUser(request),
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
