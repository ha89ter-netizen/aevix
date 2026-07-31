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
    setSidebarOpen(false);
    if (mode === "landing") {
      scrollToSection(`#${HOME_SECTION}`);
      return;
    }
    pendingHome.current = true;
    // Client-side: the shell, providers and any described business all stay mounted.
    router.push("/");
  }, [mode, router, scrollToSection]);

  const navigateSection = useCallback(
    (href: string) => {
      setSidebarOpen(false);
      if (scrollToSection(href)) return;
      // Landing section requested from a non-landing route — go there, then scroll.
      pendingHome.current = false;
      router.push(`/${href}` as never);
    },
    [router, scrollToSection],
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
