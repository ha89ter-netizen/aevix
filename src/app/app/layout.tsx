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
    ? ({
        "--accent-r": accent.r,
        "--accent-g": accent.g,
        "--accent-b": accent.b,
        // Ambient tones ride along with the accent so the whole room lights differently per
        // business, not just the interactive colour.
        "--mood-a-r": content!.mood.a.r,
        "--mood-a-g": content!.mood.a.g,
        "--mood-a-b": content!.mood.a.b,
        "--mood-b-r": content!.mood.b.r,
        "--mood-b-g": content!.mood.b.g,
        "--mood-b-b": content!.mood.b.b,
      } as CSSProperties)
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
