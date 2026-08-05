"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/lib/business-context";
import { ConsultationModal } from "@/components/site-experience";
import { ShellHeader } from "./shell-header";
import { ShellSidebar } from "./shell-sidebar";
import { landingNavItems, shellModeFor } from "./shell-nav";

const HOME_SECTION = "главная";

/**
 * The single frame every AEVIX route renders inside — landing, Workspace and an open project
 * alike. Because it lives in the root layout it is never unmounted while navigating, so moving
 * between the public site and the Workspace keeps the same sidebar, the same header and the same
 * scroll container: one application, not two that link to each other.
 *
 * It also owns the per-business theming that the landing wrapper and the Workspace layout used
 * to define separately (identical accent/mood variables, written twice), which is why those two
 * copies are gone.
 */
export function ProductShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const mode = shellModeFor(pathname);
  const { status, content } = useBusiness();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(landingNavItems[0].href);

  const accent = status === "ready" && content ? content.accent : null;
  const style = accent
    ? ({
        "--accent-r": accent.r,
        "--accent-g": accent.g,
        "--accent-b": accent.b,
        "--mood-a-r": content!.mood.a.r,
        "--mood-a-g": content!.mood.a.g,
        "--mood-a-b": content!.mood.a.b,
        "--mood-b-r": content!.mood.b.r,
        "--mood-b-g": content!.mood.b.g,
        "--mood-b-b": content!.mood.b.b,
      } as CSSProperties)
    : undefined;

  // A route change always closes the drawer: leaving it open over new content is how a mobile
  // menu ends up hiding the page the visitor just asked for.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  /**
   * Пока выдвижная панель открыта, страница под ней не прокручивается.
   *
   * Прежнее значение возвращается из замыкания, а не затирается пустой строкой: если прокрутку
   * когда-нибудь запретит кто-то ещё, слепое обнуление молча отменило бы чужой запрет.
   *
   * На десктопе панель закреплена и не является выдвижной — там блокировать нечего, поэтому
   * эффект смотрит на ширину окна.
   */
  useEffect(() => {
    if (!sidebarOpen) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    /**
     * `overflow: hidden` тут недостаточно по двум причинам сразу. На лендинге прокруткой правит
     * Lenis и двигает окно программно; а Safari на iOS просто игнорирует `overflow` на html и
     * body как способ запретить прокрутку — проверено, тест на мобильном WebKit это ловил.
     *
     * Работает единственный надёжный приём: увести body в `position: fixed`, сдвинув его вверх
     * на текущую прокрутку. Тогда страница физически не может уехать, а картинка не прыгает.
     * При закрытии позиция восстанавливается ровно там, где была.
     */
    const root = document.documentElement;
    const body = document.body;
    const offset = window.scrollY;
    const previous = {
      rootOverflow: root.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };

    root.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${offset}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      root.style.overflow = previous.rootOverflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      // Без этого страница отскочила бы наверх: пока body был fixed, окно стояло на нуле.
      window.scrollTo(0, offset);
    };
  }, [sidebarOpen]);

  // Highlights the section currently in view, but only on the landing where sections exist.
  useEffect(() => {
    if (mode !== "landing") return;
    const sections = landingNavItems
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(`#${visible.target.id}`);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [mode, pathname]);

  const scrollToSection = useCallback((href: string) => {
    const id = decodeURIComponent(href.replace("#", ""));
    const target = document.getElementById(id);
    if (!target) return false;
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    return true;
  }, []);

  // Set when we navigate home from another route, so the scroll happens once the landing has
  // actually rendered rather than against a page that isn't mounted yet.
  const pendingHome = useRef(false);

  useEffect(() => {
    if (!pendingHome.current || mode !== "landing") return;
    pendingHome.current = false;
    // One frame after the route commits, the hero exists and can be scrolled to.
    const frame = requestAnimationFrame(() => scrollToSection(`#${HOME_SECTION}`));
    return () => cancelAnimationFrame(frame);
  }, [mode, pathname, scrollToSection]);

  /** The logo's single job: back to the Hero, wherever the visitor currently is. */
  const goHome = useCallback(() => {
    if (mode === "landing" && sidebarOpen) {
      pendingScroll.current = `#${HOME_SECTION}`;
      setSidebarOpen(false);
      return;
    }
    setSidebarOpen(false);
    if (mode === "landing") {
      scrollToSection(`#${HOME_SECTION}`);
      return;
    }
    pendingHome.current = true;
    // Client-side: the shell, providers and any described business all stay mounted.
    router.push("/");
  }, [mode, router, scrollToSection, sidebarOpen]);

  /**
   * Куда прокрутить, когда выдвижная панель закроется.
   *
   * Пока панель открыта, страница заперта: body уведён в `position: fixed`. Прокручивать в этот
   * момент бессмысленно — прокрутки нет, — а снятие замка вдобавок возвращает прежнюю позицию и
   * отменило бы переход. Поэтому цель запоминается и отрабатывает после закрытия.
   */
  const pendingScroll = useRef<string | null>(null);

  useEffect(() => {
    if (sidebarOpen || !pendingScroll.current) return;
    const href = pendingScroll.current;
    pendingScroll.current = null;
    // Кадром позже: к этому моменту замок снят и позиция восстановлена, так что прокрутка
    // ложится поверх, а не под неё.
    const frame = requestAnimationFrame(() => {
      if (scrollToSection(href)) return;
      pendingHome.current = false;
      router.push(`/${href}` as never);
    });
    return () => cancelAnimationFrame(frame);
  }, [sidebarOpen, router, scrollToSection]);

  const navigateSection = useCallback(
    (href: string) => {
      if (sidebarOpen) {
        // Панель открыта — сначала закрыть и снять замок, прокрутка следом.
        pendingScroll.current = href;
        setSidebarOpen(false);
        return;
      }
      if (scrollToSection(href)) return;
      // Landing section requested from a non-landing route — go there, then scroll.
      pendingHome.current = false;
      router.push(`/${href}` as never);
    },
    [router, scrollToSection, sidebarOpen],
  );

  return (
    <div className={cn("shell", `shell-mode-${mode}`)} style={style} data-mode={mode}>
      <ShellSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeSection={activeSection}
        onNavigateSection={navigateSection}
      />
      <div className="shell-body">
        <ShellHeader onOpenSidebar={() => setSidebarOpen(true)} onGoHome={goHome} />
        <div className="shell-main">{children}</div>
      </div>
      {/* One consultation dialog for the whole product — the header CTA is the only thing that
          opens it, from every route. */}
      <ConsultationModal />
    </div>
  );
}
