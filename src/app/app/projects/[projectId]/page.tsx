"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Check, Palette, Pencil, Wallet, Workflow } from "lucide-react";
import { conceptStyles, generateVisualIdentity } from "@/lib/website-concept";
import { useProjects, getProjectProgress } from "@/lib/projects";
import { useCurrentProject } from "@/components/workspace/use-current-project";
import { projectHref } from "@/components/workspace/project-nav";
import { formatProjectDate } from "@/components/workspace/project-meta";

export default function ProjectOverviewPage() {
  const { project, projectId } = useCurrentProject();
  const { rename } = useProjects();
  const [editingName, setEditingName] = useState(false);

  if (!project || !projectId) return null; // layout already renders the not-found/loading state

  const progress = getProjectProgress(project);
  const identity = project.design ? generateVisualIdentity(project.design.colorIds, project.design.styleId) : null;
  const preferredStyle = conceptStyles.find((item) => item.id === project.preferredStyleId) ?? null;

  const nextAction = !progress.hasAnalysis
    ? { label: "Запустить AI-анализ", href: projectHref(projectId, "ai-consultant") }
    : !progress.hasDesign
      ? { label: "Выбрать визуальную айдентику", href: projectHref(projectId, "design") }
      : !progress.hasPricing
        ? { label: "Рассчитать стоимость", href: projectHref(projectId, "pricing") }
        : null;

  return (
    <div className="workspace-project-overview">
      <div className="workspace-page-header">
        <div>
          {editingName ? (
            <input
              autoFocus
              defaultValue={project.name}
              className="workspace-project-name-input"
              onBlur={(event) => {
                rename(project.id, event.currentTarget.value);
                setEditingName(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") setEditingName(false);
              }}
            />
          ) : (
            <button type="button" className="workspace-project-name" onClick={() => setEditingName(true)}>
              {project.name}
              <Pencil className="h-4 w-4 opacity-40" />
            </button>
          )}
          <p className="workspace-page-desc">
            {[project.businessType, project.city, `обновлён ${formatProjectDate(project.updatedAt)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {nextAction ? (
        <Link href={nextAction.href} className="workspace-next-action">
          <span>
            <span className="workspace-next-action-label">Рекомендуемый следующий шаг</span>
            <span className="workspace-next-action-title">{nextAction.label}</span>
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}

      <div className="workspace-card-grid">
        <div className="workspace-card">
          <span className="workspace-card-icon">
            <Bot className="h-5 w-5" />
          </span>
          <span className="workspace-card-title">AI-анализ</span>
          {project.analysis ? (
            <span className="workspace-card-desc">{project.analysis.shortAnswer}</span>
          ) : (
            <span className="workspace-card-desc">AI-анализ ещё не выполнен.</span>
          )}
          <Link href={projectHref(projectId, "ai-consultant")} className="workspace-card-meta">
            {project.analysis ? "Открыть анализ" : "Запустить анализ"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="workspace-card">
          <span className="workspace-card-icon">
            <Palette className="h-5 w-5" />
          </span>
          <span className="workspace-card-title">Визуальная айдентика</span>
          {project.design && identity ? (
            <>
              <span className="workspace-card-desc">
                {project.design.colorIds.length} цвет(ов), стиль «{project.design.styleId}»
              </span>
              <span className="workspace-swatch-row" aria-hidden="true">
                <i style={{ background: identity.palette.accent }} />
                <i style={{ background: identity.palette.secondary }} />
                <i style={{ background: identity.palette.background, borderColor: identity.palette.border }} />
              </span>
            </>
          ) : project.preferredColorIds.length || preferredStyle ? (
            <span className="workspace-card-desc">
              Пожелания сохранены{preferredStyle ? ` — стиль «${preferredStyle.label}»` : ""}. Осталось собрать
              концепцию.
            </span>
          ) : (
            <span className="workspace-card-desc">Фирменные цвета не выбраны.</span>
          )}
          <Link href={projectHref(projectId, "design")} className="workspace-card-meta">
            {project.design ? "Открыть дизайн" : "Выбрать айдентику"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="workspace-card">
          <span className="workspace-card-icon">
            <Workflow className="h-5 w-5" />
          </span>
          <span className="workspace-card-title">Процесс</span>
          {progress.hasWorkflow ? (
            <span className="workspace-card-desc">{project.analysis?.flow.length} шагов в карте процесса.</span>
          ) : (
            <span className="workspace-card-desc">Карта процесса появится после AI-анализа.</span>
          )}
          <Link href={projectHref(projectId, "workflow")} className="workspace-card-meta">
            Открыть процесс <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="workspace-card">
          <span className="workspace-card-icon">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="workspace-card-title">Стоимость</span>
          {project.pricing ? (
            <span className="workspace-card-desc">{project.pricing.result.estimatedRange}</span>
          ) : (
            <span className="workspace-card-desc">Стоимость пока не рассчитана.</span>
          )}
          <Link href={projectHref(projectId, "pricing")} className="workspace-card-meta">
            {project.pricing ? "Открыть расчёт" : "Рассчитать стоимость"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {progress.completedCount === progress.totalCount ? (
        <p className="workspace-project-complete">
          <Check className="h-4 w-4" /> Все разделы проекта заполнены.
        </p>
      ) : null}
    </div>
  );
}
