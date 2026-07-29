"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, Settings, Sparkles, UserCircle } from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { workspacePageTitle } from "./nav-config";

export function WorkspaceTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const { status, profile } = useBusiness();
  const title = workspacePageTitle(pathname);
  const personalized = status === "ready" && profile;

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-left">
        <button
          type="button"
          className="workspace-topbar-menu"
          onClick={onOpenSidebar}
          aria-label="Открыть навигацию"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
        <h1 className="workspace-topbar-title">{title}</h1>
        {personalized ? (
          <Link href="/app/business-analysis" className="workspace-topbar-business" title="Текущий бизнес-контекст">
            {profile.label}
          </Link>
        ) : null}
      </div>

      <div className="workspace-topbar-search">
        <Search className="h-4 w-4" />
        <input type="search" placeholder="Поиск по проектам и разделам" aria-label="Поиск" disabled />
      </div>

      <div className="workspace-topbar-right">
        <Link href="/app/design-studio" className="workspace-topbar-action">
          <Sparkles className="h-4 w-4" />
          <span>Новый концепт</span>
        </Link>
        <button type="button" className="workspace-icon-button" title="Уведомлений пока нет" aria-label="Уведомления">
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <Link href="/app/settings" className="workspace-icon-button" title="Настройки" aria-label="Настройки">
          <Settings className="h-[18px] w-[18px]" />
        </Link>
        <Link href="/app/account" className="workspace-icon-button workspace-avatar" title="Аккаунт" aria-label="Аккаунт">
          <UserCircle className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
