"use client";

import { PricingCalculatorScene } from "@/components/site-experience";
import { useProjects } from "@/lib/projects";
import { useCurrentProject } from "@/components/workspace/use-current-project";

export default function ProjectPricingPage() {
  const { project } = useCurrentProject();
  const { savePricing } = useProjects();

  if (!project) return null;

  return (
    <div className="workspace-embed">
      <PricingCalculatorScene
        initialForm={project.pricing?.form}
        onPricingChange={(form, result) => savePricing(project.id, { form, result })}
      />
    </div>
  );
}
