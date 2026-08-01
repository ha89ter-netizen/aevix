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
      onImproveSection={() => {
        // Opening the panel is enough: it reads the section that was just selected.
        window.dispatchEvent(new CustomEvent("aevix:designer-open"));
      }}
      onConceptSaved={(concept) => saveDesign(project.id, concept)}
    />
  );
}
