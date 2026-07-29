import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function WorkspaceEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="workspace-empty">
      <span className="workspace-empty-icon">
        <Icon className="h-5 w-5" />
      </span>
      <p className="workspace-empty-title">{title}</p>
      <p className="workspace-empty-desc">{description}</p>
      {action}
    </div>
  );
}
