import {
  Bot,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  Palette,
  Settings,
  UserCircle,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

export type WorkspaceNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

/**
 * Primary destinations, in the order they matter to someone running their business through
 * AEVIX: the home dashboard, the two ways to get an AI read on the business, the object library
 * (Projects) that both of those feed into, then the two build/price tools.
 */
export const primaryNavItems: WorkspaceNavItem[] = [
  { href: "/app", label: "Дашборд", icon: LayoutDashboard },
  { href: "/app/ai-consultant", label: "AI-консультант", icon: Bot },
  { href: "/app/projects", label: "Проекты", icon: FolderKanban },
  { href: "/app/business-analysis", label: "Бизнес-анализ", icon: LineChart },
  { href: "/app/design-studio", label: "Дизайн-студия", icon: Palette },
  { href: "/app/workflow-builder", label: "Конструктор процессов", icon: Workflow },
  { href: "/app/pricing", label: "Цены", icon: Wallet },
];

/**
 * Favorites/Recent are deliberately NOT separate top-level destinations here — with no projects
 * yet, two more nav entries would just be two more empty states pointing at the same page.
 * They live as filters inside /app/projects instead (the same pattern Notion/Linear use for
 * "recent" — a view over one object list, not its own destination).
 */
export const secondaryNavItems: WorkspaceNavItem[] = [
  { href: "/app/settings", label: "Настройки", icon: Settings },
  { href: "/app/account", label: "Аккаунт", icon: UserCircle },
];

export function workspacePageTitle(pathname: string): string {
  const all = [...primaryNavItems, ...secondaryNavItems];
  const exact = all.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const byPrefix = all.find((item) => item.href !== "/app" && pathname.startsWith(item.href));
  return byPrefix?.label ?? "Workspace";
}
