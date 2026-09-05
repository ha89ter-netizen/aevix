"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { useBusiness } from "@/lib/business-context";
import { ConsultationModal } from "@/components/site-experience";
import { ShellHeader } from "./shell-header";
import { ShellSidebar } from "./shell-sidebar";
import { landingNavItems, landingSections, navHrefForSection, publicRoutes, shellModeFor } from "./shell-nav";


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

  /**
   * Подсветка положения. Наблюдение идёт за ВСЕМИ разделами реестра, а не только за пунктами
   * меню: раздел, о котором наблюдатель не знает, оставлял активным предыдущий пункт, и меню
   * сообщало «Главная», пока человек читал совсем другое. Раздел вне меню отдаёт подсветку
   * своему представителю (`navHrefForSection`), а не молчит.
   */
  useEffect(() => {
    if (mode !== "landing") return;
    /**
     * Разделы лендинга есть только НА лендинге. Правовые страницы и общий 404 живут в том же
     * режиме оболочки — у них та же шапка и та же боковая навигация, — но своих секций у них
     * нет, и подсветка застревала на первом пункте: меню сообщало «вы в разделе Главная»
     * человеку, читающему политику конфиденциальности. Пусто — честнее.
     */
    if (pathname !== publicRoutes.site) {
      setActiveSection("");
      return;
    }
    const sections = landingSections
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const href = visible?.target.id ? navHrefForSection(visible.target.id) : null;
        if (href) setActiveSection(href);
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
   * Логотип — единственный глобальный «домой», и дом продукта — входной экран.
   *
   * Раньше он на лендинге просто прокручивал страницу вверх, а из Workspace вёл на `/platform`.
   * В сумме это означало, что на `/` не ведёт НИ ОДНА ссылка во всём продукте: попасть туда
   * можно было один раз, а вернуться — только набрав адрес руками. Между тем входной экран
   * несёт локализацию и живую карту возможностей, то есть это отдельная поверхность, а не
   * заставка.
   *
   * Прокрутка к первому экрану лендинга никуда не делась: за неё отвечает пункт «Главная» в
   * навигации — обычное поведение якоря, которое не обязано занимать собой знак бренда.
   *
   * Переход клиентский: оболочка, провайдеры и описанный бизнес остаются смонтированными.
   */
  const goHome = useCallback(() => {
    setSidebarOpen(false);
    router.push(publicRoutes.entry);
  }, [router]);

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
