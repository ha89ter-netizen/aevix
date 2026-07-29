import { useParams } from "next/navigation";
import { useProjects } from "@/lib/projects";

/**
 * Reads the project straight out of the existing `useProjects()` store by the `[projectId]`
 * route param — no separate "current project" context, so there's exactly one source of truth
 * for project data regardless of whether it's read from a project route or the global list.
 */
export function useCurrentProject() {
  const params = useParams<{ projectId?: string }>();
  const { getProject, isLoaded } = useProjects();
  const projectId = params?.projectId;
  const project = projectId ? getProject(projectId) : null;
  return { project, projectId, isLoaded };
}
