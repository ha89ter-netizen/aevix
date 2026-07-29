"use client";

import { AiConsultantScene } from "@/components/site-experience";
import { useProjects } from "@/lib/projects";
import { useCurrentProject } from "@/components/workspace/use-current-project";

export default function ProjectAiConsultantPage() {
  const { project } = useCurrentProject();
  const { saveAnalysis } = useProjects();

  if (!project) return null;

  return (
    <div className="workspace-embed">
      <AiConsultantScene
        initialAnalysis={project.analysis}
        onAnalysisSaved={(analysis) => saveAnalysis(project.id, analysis)}
      />
    </div>
  );
}
