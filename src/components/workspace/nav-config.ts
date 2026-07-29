import { FolderKanban, LayoutDashboard, Settings, UserCircle, type LucideIcon } from "lucide-react";
import type { Route } from "next";

export type WorkspaceNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

/**
 * The global Workspace sidebar only points at places OUTSIDE any project — the AI Consultant,
 * Design Studio and Pricing calculator are no longer separate disconnected destinations here;
 * they live inside each project's own sub-navigation (see project-nav.ts) so a saved analysis,
 * design and price all stay attached to the business they belong to.
 */
export const primaryNavItems: WorkspaceNavItem[] = [
  { href: "/app", label: "Дашборд", icon: LayoutDashboard },
  { href: "/app/projects", label: "Проекты", icon: FolderKanban },
  { href: "/app/settings", label: "Настройки", icon: Settings },
];

export const secondaryNavItems: WorkspaceNavItem[] = [{ href: "/app/account", label: "Аккаунт", icon: UserCircle }];

export function workspacePageTitle(pathname: string): string {
  const all = [...primaryNavItems, ...secondaryNavItems];
  const exact = all.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const byPrefix = all.find((item) => item.href !== "/app" && pathname.startsWith(item.href));
  return byPrefix?.label ?? "Workspace";
}
