import type { ReactNode } from "react";

/**
 * The Workspace no longer brings its own chrome. Sidebar, header, theming and the consultation
 * dialog all come from ProductShell in the root layout, which is what makes moving between the
 * public site and the Workspace a content swap inside one application rather than a jump between
 * two separately-framed products.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <div className="workspace-scope">{children}</div>;
}
