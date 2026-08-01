"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { FolderX } from "lucide-react";
import { useCurrentProject } from "@/components/workspace/use-current-project";
import { WorkspaceEmptyState } from "@/components/workspace/empty-state";
import { AiDesignerPanel } from "@/components/workspace/ai-designer-panel";
import { DesignerSelectionProvider } from "@/components/workspace/designer-selection";

/**
 * The in-page tab row that used to live here is gone: a project's sections are now the sidebar's
 * contents (see ShellSidebar's project mode). Two navigations for the same five destinations is
 * exactly the duplication that made the product feel like separate apps stitched together.
 */
export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { project, isLoaded } = useCurrentProject();

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

  return (
    <DesignerSelectionProvider>
      <div className="workspace-page workspace-project-scope">
        {children}
        {/* Available from every section of an open project, not just Overview. */}
        <AiDesignerPanel project={project} />
      </div>
    </DesignerSelectionProvider>
  );
}
