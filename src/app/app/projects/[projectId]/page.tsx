"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Palette, Pencil, RefreshCw, Wallet, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { conceptStyles, generateVisualIdentity } from "@/lib/website-concept";
import { conceptImagesFor } from "@/lib/concept-images";
import { useProjects, getProjectProgress, getProjectStatus, type GenerationScope } from "@/lib/projects";
import { useCurrentProject } from "@/components/workspace/use-current-project";
import { projectHref } from "@/components/shell/shell-nav";
import { formatProjectDate } from "@/components/workspace/project-meta";
import { GenerationScreen } from "@/components/workspace/generation-screen";

/**
 * The project's home page. It opens onto work that has already been done: what the AI understood,
 * what it built, and what each piece costs — never a grid of "generate this" buttons.
 */
export default function ProjectOverviewPage() {
  const { project, projectId } = useCurrentProject();
  const { rename, generation, regenerate } = useProjects();
  const [editingName, setEditingName] = useState(false);

  if (!project || !projectId) return null; // layout already renders the not-found/loading state

  // A run in flight for THIS project takes over the page; other projects keep rendering normally.
  if (generation && generation.projectId === project.id && generation.scope.length === 3) {
    return <GenerationScreen stage={generation.stage} projectName={project.name} />;
  }

  const progress = getProjectProgress(project);
  const status = getProjectStatus(project, generation?.projectId ?? null);
  const identity = project.design ? generateVisualIdentity(project.design.colorIds, project.design.styleId) : null;
  const imagery = conceptImagesFor(project.businessType, project.name);
  const styleLabels = project.preferredStyleIds
    .map((id) => conceptStyles.find((style) => style.id === id)?.label)
    .filter(Boolean) as string[];

  const isBusy = (scope: GenerationScope) =>
    Boolean(generation && generation.projectId === project.id && generation.scope.includes(scope));

  const cards = [
    {
      scope: "analysis" as GenerationScope,
      icon: Bot,
      title: "AI-анализ",
      href: projectHref(projectId, "ai-consultant"),
      ready: progress.hasAnalysis,
      summary: project.analysis?.shortAnswer ?? "Анализ не собран.",
      thumb: <span className="overview-thumb-text">{project.analysis?.recommendedSolution ?? "—"}</span>,
    },
    {
      scope: "design" as GenerationScope,
      icon: Palette,
      title: "Сайт",
      href: projectHref(projectId, "design"),
      ready: progress.hasDesign,
      summary: project.design
        ? `${project.design.pages.length} страниц(ы), стиль «${conceptStyles.find((s) => s.id === project.design!.styleId)?.label ?? project.design.styleId}»`
        : "Концепт сайта не собран.",
      thumb: identity ? (
        <span className="overview-thumb-identity" style={{ background: identity.palette.background }}>
          <i style={{ background: identity.palette.accent }} />
          <i style={{ background: identity.palette.secondary }} />
          <i style={{ background: identity.palette.surface, borderColor: identity.palette.border }} />
        </span>
      ) : null,
    },
    {
      scope: "analysis" as GenerationScope,
      icon: Workflow,
      title: "Процесс",
      href: projectHref(projectId, "workflow"),
      ready: progress.hasWorkflow,
      summary: progress.hasWorkflow ? `${project.analysis?.flow.length} шагов в карте процесса.` : "Карта процесса не построена.",
      thumb: (
        <span className="overview-thumb-flow">
          {(project.analysis?.flow ?? []).slice(0, 4).map((step) => (
            <i key={step} />
          ))}
        </span>
      ),
    },
    {
      scope: "pricing" as GenerationScope,
      icon: Wallet,
      title: "Стоимость",
      href: projectHref(projectId, "pricing"),
      ready: progress.hasPricing,
      summary: project.pricing?.result.estimatedRange ?? "Стоимость не рассчитана.",
      thumb: <span className="overview-thumb-text">{project.pricing?.result.recommendedModules.slice(0, 3).join(" · ") ?? "—"}</span>,
    },
  ];

  return (
    <div className="workspace-project-overview">
      <section className="overview-summary" style={{ backgroundImage: `url(${imagery.hero})` }}>
        <div className="overview-summary-inner">
          <span className={cn("workspace-status-badge", `is-${status.id}`)}>{status.label}</span>
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
          {project.businessDescription ? <p className="overview-brief">{project.businessDescription}</p> : null}

          <dl className="overview-facts">
            <div>
              <dt>Ниша</dt>
              <dd>{project.businessType || "—"}</dd>
            </div>
            <div>
              <dt>Город</dt>
              <dd>{project.city || "—"}</dd>
            </div>
            <div>
              <dt>Стиль</dt>
              <dd>{styleLabels.length ? styleLabels.join(", ") : "—"}</dd>
            </div>
            <div>
              <dt>Сгенерирован</dt>
              <dd>{project.generatedAt ? formatProjectDate(project.generatedAt) : "—"}</dd>
            </div>
            <div>
              <dt>Обновлён</dt>
              <dd>{formatProjectDate(project.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="overview-card-grid">
        {cards.map((card) => {
          const busy = isBusy(card.scope);
          return (
            <article key={card.title} className={cn("overview-card", busy && "is-busy")}>
              <div className="overview-card-thumb">{busy ? <RefreshCw className="h-5 w-5 animate-spin" /> : card.thumb}</div>
              <div className="overview-card-body">
                <span className="overview-card-icon">
                  <card.icon className="h-4 w-4" />
                </span>
                <h3>{card.title}</h3>
                <p>{busy ? "Пересобираем…" : card.summary}</p>
                <span className={cn("overview-card-status", card.ready ? "is-ready" : "is-empty")}>
                  {busy ? "Генерация" : card.ready ? "Готово" : "Нет данных"}
                </span>
              </div>
              <div className="overview-card-actions">
                <Link href={card.href} className="overview-card-open">
                  Открыть <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  className="overview-card-regen"
                  disabled={Boolean(generation)}
                  onClick={() => void regenerate(project, card.scope)}
                  title={`Пересобрать: ${card.title}`}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
