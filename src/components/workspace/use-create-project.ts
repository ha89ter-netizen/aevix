import { useRouter } from "next/navigation";
import { useProjects, type CreateProjectInput } from "@/lib/projects";
import { projectHref } from "./project-nav";

/** The one place "create a project, then open it" happens — used by the sidebar's "New Project",
 * the topbar's quick action, and the Dashboard's "create from this business" CTA. */
export function useCreateAndOpenProject() {
  const router = useRouter();
  const { create } = useProjects();

  return (input: CreateProjectInput) => {
    const project = create(input);
    router.push(projectHref(project.id, "overview"));
    return project;
  };
}
