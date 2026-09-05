import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * The Workspace no longer brings its own chrome. Sidebar, header, theming and the consultation
 * dialog all come from ProductShell in the root layout, which is what makes moving between the
 * public site and the Workspace a content swap inside one application rather than a jump between
 * two separately-framed products.
 */

/**
 * Workspace не индексируется — весь, одним объявлением на корне ветки `/app`.
 *
 * Здесь нет ничего, что имело бы смысл в выдаче: содержание принадлежит вошедшему человеку, а
 * робот увидел бы пустую оболочку и предложил её вместо `/platform`. `robots.txt` просит того же,
 * но он — просьба к обходчику; этот заголовок говорит уже про индекс, и вместе они закрывают оба
 * случая. Ни то, ни другое не является защитой данных: её по-прежнему держат сессия и владение.
 *
 * Дочерние `layout.tsx` переопределяют только `title` — `robots` они не трогают и наследуют
 * отсюда, поэтому новая поверхность Workspace закрыта по умолчанию, а не по памяти автора.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <div className="workspace-scope">{children}</div>;
}
