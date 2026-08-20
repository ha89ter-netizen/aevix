"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { useBusiness } from "@/lib/business-context";
import { ConsultationModal } from "@/components/site-experience";
import { ShellHeader } from "./shell-header";
import { ShellSidebar } from "./shell-sidebar";
import { landingNavItems, publicRoutes, shellModeFor } from "./shell-nav";

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
  /**
   * На широком экране панель закреплена и не выдвигается — блокировать прокрутку там нечего.
   *
   * Подписка, а не разовая проверка: поворот планшета меняет ответ, и прежний код этого не
   * видел. Начальное значение считается синхронно, а не через первый эффект: лишний перерендер
   * всей оболочки сразу после монтирования сдвигает тайминги всего, что под ней, — в том числе
   * гонки загрузки проектов, на которой мигает переименование.
   */
  const [isWide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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
   * Сам приём — общий хук: он тонкий (Lenis на лендинге и Safari на iOS, игнорирующий
   * `overflow`), добыт дорого и обязан быть один на продукт. Вторая его копия неизбежно
   * разошлась бы с первой.
   *
   * На десктопе панель закреплена и не является выдвижной — там блокировать нечего, поэтому
   * условие смотрит на ширину окна.
   */
  useScrollLock(sidebarOpen && !isWide);

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

  /**
   * Логотип ведёт на главную сайта, а не на входной экран.
   *
   * Входной экран — это первое впечатление, и возвращаться в него из продукта незачем: человек
   * его уже видел и шёл дальше. От логотипа ждут «домой», а дом здесь — начало содержательного
   * сайта, то есть его первый экран.
   *
   * Флаг «доскроллить до героя» тут не ставится: `/platform` и так открывается сверху, а флаг,
   * не отработавший сразу, выстрелил бы позже неожиданной прокруткой посреди чтения.
   */
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
    // Клиентский переход: оболочка, провайдеры и описанный бизнес остаются смонтированными.
    router.push(publicRoutes.site);
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
      router.push(`${publicRoutes.site}${href}` as never);
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
      // Раздел лендинга запрошен не с лендинга: сначала туда, потом прокрутка. Именно на
      // `/platform` — разделы живут там, а в корне теперь входной экран без якорей.
      router.push(`${publicRoutes.site}${href}` as never);
    },
    [router, scrollToSection, sidebarOpen],
  );

  /**
   * Входной экран рисуется без рамки продукта.
   *
   * У него своя навигация — логотип и языки, больше ничего, — и любая примесь общей шапки,
   * боковой панели или кнопки консультации разрушила бы то единственное, ради чего он
   * существует: первое впечатление. Это не исключение из модели, а её продолжение: режим
   * по-прежнему выводится из маршрута, просто у этого режима рамки нет.
   *
   * Провайдеры при этом остаются выше по дереву, поэтому переход «входной экран → сайт →
   * Workspace» не перемонтирует приложение и не теряет состояние.
   */
  if (mode === "entry") return <>{children}</>;

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
