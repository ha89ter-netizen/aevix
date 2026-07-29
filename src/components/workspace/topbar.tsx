"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, CloudOff, FolderPlus, Loader2, Menu } from "lucide-react";
import { useProjects } from "@/lib/projects";
import { useCurrentProject } from "./use-current-project";
import { projectSectionLabel } from "./project-nav";
import { workspacePageTitle } from "./nav-config";

export function WorkspaceTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const { saveState } = useProjects();
  const { project, projectId } = useCurrentProject();

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
      </div>

      <div className="workspace-topbar-right">
        {saveState !== "idle" ? (
          <span
            className="workspace-save-indicator"
            title="Проекты пока хранятся только на этом устройстве."
            role="status"
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Сохранение…</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Сохранено</span>
                <CloudOff className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
              </>
            )}
          </span>
        ) : null}
        <Link href="/app/new" className="workspace-topbar-action" aria-label="Создать проект">
          <FolderPlus className="h-4 w-4" />
          <span>Создать проект</span>
        </Link>
      </div>
    </header>
  );
}
