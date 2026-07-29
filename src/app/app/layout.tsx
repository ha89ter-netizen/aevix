"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useBusiness } from "@/lib/business-context";
import { ConsultationModal } from "@/components/site-experience";
import { WorkspaceSidebar } from "@/components/workspace/sidebar";
import { WorkspaceTopbar } from "@/components/workspace/topbar";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status, content } = useBusiness();
  const accent = status === "ready" && content ? content.accent : null;
  const style = accent
    ? ({ "--accent-r": accent.r, "--accent-g": accent.g, "--accent-b": accent.b } as CSSProperties)
    : undefined;

  return (
    <div className="workspace-shell" style={style}>
      <WorkspaceSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="workspace-body">
        <WorkspaceTopbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="workspace-main">{children}</main>
      </div>
      <ConsultationModal />
    </div>
  );
}
