"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FolderPlus, Menu, Search, Settings, UserCircle } from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { useCurrentProject } from "./use-current-project";
import { useCreateAndOpenProject } from "./use-create-project";
import { projectSectionLabel } from "./project-nav";
import { workspacePageTitle } from "./nav-config";

export function WorkspaceTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const { status, profile } = useBusiness();
  const { project, projectId } = useCurrentProject();
  const createAndOpen = useCreateAndOpenProject();
  const personalized = status === "ready" && profile;

  const title = project && projectId ? project.name : workspacePageTitle(pathname);
  const sectionLabel = project && projectId ? projectSectionLabel(projectId, pathname) : null;

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
        {sectionLabel ? <span className="workspace-topbar-section">{sectionLabel}</span> : null}
        {!project && personalized ? (
          <Link href="/app" className="workspace-topbar-business" title="Текущий бизнес-контекст">
            {profile.label}
          </Link>
        ) : null}
      </div>

      <div className="workspace-topbar-search">
        <Search className="h-4 w-4" />
        <input type="search" placeholder="Поиск по проектам и разделам" aria-label="Поиск" disabled />
      </div>

      <div className="workspace-topbar-right">
        <button
          type="button"
          className="workspace-topbar-action"
          aria-label="Новый проект"
          onClick={() => createAndOpen({ name: "Новый проект", businessType: "", businessDescription: "" })}
        >
          <FolderPlus className="h-4 w-4" />
          <span>Новый проект</span>
        </button>
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
