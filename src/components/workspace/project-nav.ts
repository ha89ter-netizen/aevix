import { Bot, LayoutDashboard, Palette, Wallet, Workflow, type LucideIcon } from "lucide-react";
import type { Route } from "next";

export type ProjectSectionItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

export type ProjectSection = "overview" | "ai-consultant" | "design" | "workflow" | "pricing";

/** The one place that builds a project sub-route path, so the `as Route` cast (dynamic segments
 * aren't literal strings typedRoutes can check) lives in exactly one spot. */
export function projectHref(projectId: string, section: ProjectSection = "overview"): Route {
  const path = section === "overview" ? `/app/projects/${projectId}` : `/app/projects/${projectId}/${section}`;
  return path as Route;
}

/** Project-level navigation — distinct from the global Workspace sidebar (Part 11): these are
 * the modules of ONE open project, not other places in the app. */
export function projectSectionItems(projectId: string): ProjectSectionItem[] {
  return [
    { href: projectHref(projectId, "overview"), label: "Обзор", icon: LayoutDashboard },
    { href: projectHref(projectId, "ai-consultant"), label: "AI-консультант", icon: Bot },
    { href: projectHref(projectId, "design"), label: "Дизайн", icon: Palette },
    { href: projectHref(projectId, "workflow"), label: "Процесс", icon: Workflow },
    { href: projectHref(projectId, "pricing"), label: "Цены", icon: Wallet },
  ];
}

export function projectSectionLabel(projectId: string, pathname: string): string {
  const items = projectSectionItems(projectId);
  const exact = items.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const byPrefix = [...items].reverse().find((item) => item.href !== items[0].href && pathname.startsWith(item.href));
  return byPrefix?.label ?? "Обзор";
}
