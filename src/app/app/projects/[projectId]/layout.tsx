"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FolderX } from "lucide-react";
import { useCurrentProject } from "@/components/workspace/use-current-project";
import { projectSectionItems } from "@/components/workspace/project-nav";
import { WorkspaceEmptyState } from "@/components/workspace/empty-state";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { project, projectId, isLoaded } = useCurrentProject();
  const pathname = usePathname();

  if (!isLoaded) {
    // localStorage hasn't been read yet — a beat, not an error. Avoids flashing "not found"
    // for a project that's actually there.
    return <div className="workspace-page" aria-hidden="true" />;
  }

  if (!project) {
    return (
      <div className="workspace-page">
        <WorkspaceEmptyState
          icon={FolderX}
          title="Проект не найден"
          description="Возможно, он был удалён или ссылка устарела. Откройте список проектов, чтобы найти нужный."
          action={
            <Link href="/app/projects" className="workspace-topbar-action">
              К списку проектов
            </Link>
          }
        />
      </div>
    );
  }

  const items = projectId ? projectSectionItems(projectId) : [];

  return (
    <div className="workspace-page">
      <div className="workspace-tabs" role="tablist" aria-label="Разделы проекта">
        {items.map((item) => {
          const active = item.href === pathname;
          return (
            <Link
              key={item.href}
              href={item.href}
              role="tab"
              aria-selected={active}
              className={cn("workspace-tab", active && "is-active")}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
