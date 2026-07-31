import {
  ArrowLeft,
  Bot,
  FolderKanban,
  FolderPlus,
  Globe2,
  LayoutDashboard,
  Palette,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

/**
 * One navigation model for the whole product.
 *
 * AEVIX used to carry three unrelated navigations: a floating pill header with its own modal
 * "navigation centre" on the landing page, a separate sidebar in the Workspace, and a third row
 * of tabs inside an open project. Each was self-consistent and none of them agreed with the
 * others, which is what made the product read as a landing page bolted onto a dashboard.
 *
 * Now there is a single sidebar whose CONTENTS depend on where the visitor is, and the mode is
 * derived from the URL alone — never from component state — so the sidebar can never disagree
 * with the route, and the three sets can never appear at once.
 */

export type ShellMode = "landing" | "workspace" | "project";

export type ShellNavItem = {
  /** In-page anchor on the landing, a real route everywhere else. */
  href: string;
  label: string;
  icon?: LucideIcon;
};

/** The public site, in the order a visitor reads it. Every target is a real section id. */
export const landingNavItems: ShellNavItem[] = [
  { href: "#главная", label: "Главная" },
  { href: "#что-такое-aevix", label: "Возможности" },
  { href: "#процесс", label: "Как работает" },
  { href: "#результаты", label: "Кейсы" },
  { href: "#стоимость", label: "Цены" },
  { href: "#faq", label: "FAQ" },
  { href: "#контакты", label: "Контакты" },
];

export const workspaceNavItems: ShellNavItem[] = [
  { href: "/app/projects", label: "Проекты", icon: FolderKanban },
  { href: "/app/new", label: "Создать проект", icon: FolderPlus },
];

export type ProjectSectionId = "overview" | "ai-consultant" | "design" | "workflow" | "pricing";

const PROJECT_SECTIONS: Array<{ id: ProjectSectionId; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "ai-consultant", label: "AI-консультант", icon: Bot },
  { id: "design", label: "Дизайн", icon: Palette },
  { id: "workflow", label: "Процесс", icon: Workflow },
  { id: "pricing", label: "Цены", icon: Wallet },
];

/** The one place a project sub-route is built, so the `as Route` cast (dynamic segments are not
 * literals typedRoutes can check) lives in exactly one spot. */
export function projectHref(projectId: string, section: ProjectSectionId = "overview"): Route {
  const path = section === "overview" ? `/app/projects/${projectId}` : `/app/projects/${projectId}/${section}`;
  return path as Route;
}

export function projectNavItems(projectId: string): ShellNavItem[] {
  return PROJECT_SECTIONS.map((section) => ({
    href: projectHref(projectId, section.id),
    label: section.label,
    icon: section.icon,
  }));
}

/** Extracts the project id from any `/app/projects/<id>...` path. */
export function projectIdFromPath(pathname: string): string | null {
  const match = /^\/app\/projects\/([^/]+)/.exec(pathname);
  const id = match?.[1];
  // `/app/projects` itself is the list, not a project.
  return id && id !== "" ? decodeURIComponent(id) : null;
}

export function shellModeFor(pathname: string): ShellMode {
  if (projectIdFromPath(pathname)) return "project";
  if (pathname.startsWith("/app")) return "workspace";
  return "landing";
}

/** The title shown in the centre of the header — always the name of where you actually are. */
export function shellTitle(pathname: string, projectName?: string | null): string {
  const mode = shellModeFor(pathname);
  if (mode === "project") {
    const section = PROJECT_SECTIONS.find((item) => projectHref(projectIdFromPath(pathname)!, item.id) === pathname);
    // The project's own name is the headline; the section qualifies it (see ShellHeader).
    return projectName || section?.label || "Проект";
  }
  if (mode === "workspace") {
    if (pathname.startsWith("/app/new")) return "Создать проект";
    return "Workspace";
  }
  return "Главная";
}

/** Section label for the project header's subtitle, or null outside a project. */
export function projectSectionLabel(pathname: string): string | null {
  const projectId = projectIdFromPath(pathname);
  if (!projectId) return null;
  const section = PROJECT_SECTIONS.find((item) => projectHref(projectId, item.id) === pathname);
  return section?.label ?? "Обзор";
}

/** Where the sidebar's cross-context link goes, and what it says. */
export const shellCrossLinks = {
  toWorkspace: { href: "/app/projects" as Route, label: "Workspace", icon: LayoutDashboard },
  toSite: { href: "/" as Route, label: "На сайт AEVIX", icon: Globe2 },
  toProjects: { href: "/app/projects" as Route, label: "Все проекты", icon: ArrowLeft },
} as const;
