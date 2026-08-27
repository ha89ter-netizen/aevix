import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Заголовок вкладки для этой поверхности Workspace. Раньше все они наследовали общий заголовок
 *  приложения, и пять открытых вкладок не различались ни в браузере, ни в истории. */
export const metadata: Metadata = { title: "Вход и регистрация" };

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
