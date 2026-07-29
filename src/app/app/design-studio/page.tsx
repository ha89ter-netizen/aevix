"use client";

import { Palette } from "lucide-react";
import { WebsiteConceptExperience } from "@/components/website-concept-experience";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { WorkspaceEmptyState } from "@/components/workspace/empty-state";
import { useProjects } from "@/lib/projects";
import { formatProjectDate } from "@/components/workspace/project-meta";

export default function DesignStudioPage() {
  const { projects } = useProjects();
  const concepts = projects.filter((project) => project.kind === "design-concept");

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        title="Дизайн-студия"
        description="Соберите визуальный концепт сайта под конкретный бизнес: стиль, цвета и структура генерируются вместе."
      />

      <WebsiteConceptExperience />

      <section>
        <p className="workspace-section-label">Сохранённые концепты</p>
        {concepts.length ? (
          <div className="workspace-card-grid">
            {concepts.map((project) => (
              <div key={project.id} className="workspace-card">
                <span className="workspace-card-icon">
                  <Palette className="h-5 w-5" />
                </span>
                <span className="workspace-card-title">{project.name}</span>
                <span className="workspace-card-desc">{project.summary}</span>
                <span className="workspace-card-meta">{formatProjectDate(project.updatedAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            icon={Palette}
            title="Пока нет сохранённых концептов"
            description="Собранные здесь концепты появятся в этом списке и в разделе «Проекты»."
          />
        )}
      </section>
    </div>
  );
}
