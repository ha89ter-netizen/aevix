"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/lib/business-context";
import { useProjects } from "@/lib/projects";
import {
  landingNavItems,
  projectIdFromPath,
  projectNavItems,
  shellCrossLinks,
  shellModeFor,
  workspaceNavItems,
} from "./shell-nav";

/**
 * The product's main navigation. Which of the three sets it shows is derived from the pathname,
 * so the landing links physically cannot appear inside a project and vice versa — the sets are
 * mutually exclusive by construction rather than by careful prop passing.
 */
export function ShellSidebar({
  open,
  onClose,
  activeSection,
  onNavigateSection,
}: {
  open: boolean;
  onClose: () => void;
  /** Currently visible landing section (`#id`), highlighted while scrolling. */
  activeSection: string;
  onNavigateSection: (href: string) => void;
}) {
  const pathname = usePathname();
  const mode = shellModeFor(pathname);
  const projectId = projectIdFromPath(pathname);
  const { status, profile, content, reset } = useBusiness();
  const { getProject } = useProjects();
  const personalized = status === "ready" && profile && content;
  const project = projectId ? getProject(projectId) : null;

  return (
    <>
      <div className={cn("shell-scrim", open && "is-open")} onClick={onClose} aria-hidden="true" />
      <aside className={cn("shell-sidebar", open && "is-open")} aria-label="Основная навигация">
        <div className="shell-sidebar-head">
          <p className="shell-sidebar-eyebrow">
            {mode === "landing" ? "Сайт" : mode === "workspace" ? "Workspace" : "Проект"}
          </p>
          <button type="button" className="shell-sidebar-close" onClick={onClose} aria-label="Закрыть меню">
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === "landing" ? (
          <>
            <nav className="shell-nav" aria-label="Разделы сайта">
              {landingNavItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  className={cn("shell-nav-item", activeSection === item.href && "is-active")}
                  aria-current={activeSection === item.href ? "true" : undefined}
                  onClick={() => onNavigateSection(item.href)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {personalized ? (
              <div className="shell-persona">
                <span className="shell-persona-label">Интерфейс настроен</span>
                <strong className="shell-persona-value">{profile.label}</strong>
                <button type="button" className="shell-persona-reset" onClick={reset}>
                  <RotateCcw className="h-3.5 w-3.5" /> Сбросить
                </button>
              </div>
            ) : null}

            <div className="shell-sidebar-spacer" />

            <Link href={shellCrossLinks.toWorkspace.href} className="shell-sidebar-exit" onClick={onClose}>
              <shellCrossLinks.toWorkspace.icon className="h-4 w-4" />
              {shellCrossLinks.toWorkspace.label}
            </Link>
          </>
        ) : null}

        {mode === "workspace" ? (
          <>
            <nav className="shell-nav" aria-label="Разделы Workspace">
              {workspaceNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href as never}
                    className={cn("shell-nav-item", active && "is-active")}
                    aria-current={active ? "page" : undefined}
                    onClick={onClose}
                  >
                    {item.icon ? <item.icon className="h-[18px] w-[18px]" /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="shell-sidebar-spacer" />

            <Link href={shellCrossLinks.toSite.href} className="shell-sidebar-exit" onClick={onClose}>
              <shellCrossLinks.toSite.icon className="h-4 w-4" />
              {shellCrossLinks.toSite.label}
            </Link>
          </>
        ) : null}

        {mode === "project" && projectId ? (
          <>
            {/* The way back out of a project is the first thing in the panel, so "how do I get
                back?" is answered before the visitor has to look for it. */}
            <Link href={shellCrossLinks.toProjects.href} className="shell-back" onClick={onClose}>
              <shellCrossLinks.toProjects.icon className="h-4 w-4" />
              {shellCrossLinks.toProjects.label}
            </Link>

            {project ? <p className="shell-project-name">{project.name}</p> : null}

            <nav className="shell-nav" aria-label="Разделы проекта">
              {projectNavItems(projectId).map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href as never}
                    className={cn("shell-nav-item", active && "is-active")}
                    aria-current={active ? "page" : undefined}
                    onClick={onClose}
                  >
                    {item.icon ? <item.icon className="h-[18px] w-[18px]" /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="shell-sidebar-spacer" />

            <Link href={shellCrossLinks.toSite.href} className="shell-sidebar-exit" onClick={onClose}>
              <shellCrossLinks.toSite.icon className="h-4 w-4" />
              {shellCrossLinks.toSite.label}
            </Link>
          </>
        ) : null}
      </aside>
    </>
  );
}
