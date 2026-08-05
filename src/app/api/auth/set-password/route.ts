import { NextResponse } from "next/server";
import { currentUser, isAuthConfigured, passwordProblem, setPassword } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Задать или сменить пароль — из настроек, уже войдя.
 *
 * Именно этим закрывается дыра, которую пароли открывают сами по себе: аккаунты, заведённые до
 * них, и любой забывший пароль входят по коду из письма и задают новый здесь. Без этого
 * забытый пароль означал бы потерянный аккаунт вместе со всеми проектами.
 */
export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "Недоступно: на сервере не настроены база или ключ подписи сессий." }, { status: 503 });
  }

  const user = currentUser(request);
  if (!user) return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Проверьте заполненные поля." }, { status: 400 });
  }

  const { password, confirm } = (body ?? {}) as { password?: unknown; confirm?: unknown };
  if (typeof password !== "string") return NextResponse.json({ error: "Придумайте пароль.", field: "password" }, { status: 400 });

  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem, field: "password" }, { status: 400 });
  if (password !== confirm) return NextResponse.json({ error: "Пароли не совпадают.", field: "confirm" }, { status: 400 });

  try {
    await setPassword(user.id, password);
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("[auth] Смена пароля не удалась", error);
    return NextResponse.json({ error: "Не удалось сохранить пароль. Попробуйте ещё раз." }, { status: 500 });
  }
}
