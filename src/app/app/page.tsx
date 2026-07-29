import { redirect } from "next/navigation";

/** The Workspace home IS the projects list — projects are the center of the platform, and a
 * separate "dashboard" page would only duplicate (or fake) what the list already shows. */
export default function WorkspaceHomePage() {
  redirect("/app/projects");
}
