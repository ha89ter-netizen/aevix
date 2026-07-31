"use client";

import { WebsiteConceptExperience } from "@/components/website-concept-experience";
import { useProjects } from "@/lib/projects";
import { useCurrentProject } from "@/components/workspace/use-current-project";

export default function ProjectDesignPage() {
  const { project } = useCurrentProject();
  const { saveDesign } = useProjects();

  if (!project) return null;

  return (
    <WebsiteConceptExperience
      embedded
      initialConcept={project.design}
      onConceptSaved={(concept) => saveDesign(project.id, concept)}
    />
  );
}
