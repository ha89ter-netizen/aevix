import type { ReactNode } from "react";

export function WorkspacePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="workspace-page-header">
      <div>
        <h2 className="workspace-page-title">{title}</h2>
        {description ? <p className="workspace-page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="workspace-page-actions">{actions}</div> : null}
    </div>
  );
}
