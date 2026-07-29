import { FolderKanban, FolderPlus, type LucideIcon } from "lucide-react";
import type { Route } from "next";

export type WorkspaceNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

/**
 * The whole global sidebar. Deliberately tiny: only destinations that fully work exist here —
 * anything not implemented yet (account, settings, notifications, …) simply isn't in the UI.
 */
export const primaryNavItems: WorkspaceNavItem[] = [
  { href: "/app/projects", label: "Проекты", icon: FolderKanban },
  { href: "/app/new", label: "Создать проект", icon: FolderPlus },
];

export function workspacePageTitle(pathname: string): string {
  const exact = primaryNavItems.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const byPrefix = primaryNavItems.find((item) => pathname.startsWith(`${item.href}/`));
  return byPrefix?.label ?? "Проекты";
}
