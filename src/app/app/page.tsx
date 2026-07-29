"use client";

import Link from "next/link";
import { ArrowRight, Bot, FolderKanban, Sparkles, Star } from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { useProjects, getProjectProgress } from "@/lib/projects";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { WorkspaceEmptyState } from "@/components/workspace/empty-state";
import { projectHref } from "@/components/workspace/project-nav";
import { useCreateAndOpenProject } from "@/components/workspace/use-create-project";
import { formatProjectDate } from "@/components/workspace/project-meta";

export default function DashboardPage() {
  const { status, profile, input } = useBusiness();
  const { projects, recent, favorites, isLoaded } = useProjects();
  const createAndOpen = useCreateAndOpenProject();
  const personalized = status === "ready" && profile;

  // Only offer "create from this business" once — if a project already carries this exact
  // description, creating another would just duplicate it on every visit to the Dashboard.
  const alreadyHasProject = personalized && projects.some((project) => project.businessDescription === input);

  const createFromBusiness = () => {
    if (!personalized) return;
    createAndOpen({
      name: profile.label,
      businessType: profile.label,
      businessDescription: input,
    });
  };

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        title={personalized ? `С возвращением, ${profile.label.toLowerCase()}` : "Дашборд"}
        description={
          personalized
            ? "Вот что можно сделать дальше с вашим бизнесом."
            : "Опишите бизнес на главной странице или создайте новый проект — и дашборд станет вашим."
        }
        actions={
          <button type="button" className="workspace-topbar-action" aria-label="Новый проект" onClick={() => createAndOpen({ name: "Новый проект", businessType: "", businessDescription: "" })}>
            <Sparkles className="h-4 w-4" />
            <span>Новый проект</span>
          </button>
        }
      />

      {personalized && !alreadyHasProject ? (
        <button type="button" onClick={createFromBusiness} className="workspace-next-action">
          <span>
            <span className="workspace-next-action-label">Распознанный бизнес</span>
            <span className="workspace-next-action-title">Создать проект «{profile.label}»</span>
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}

      {recent.length ? (
        <section>
          <div className="workspace-section-head">
            <p className="workspace-section-label">Продолжить проект</p>
            <Link href="/app/projects" className="workspace-section-link">
              Все проекты
            </Link>
          </div>
          <div className="workspace-card-grid">
            {recent.map((project) => {
              const progress = getProjectProgress(project);
              return (
                <Link key={project.id} href={projectHref(project.id)} className="workspace-card">
                  <span className="workspace-card-icon">
                    <Bot className="h-5 w-5" />
                  </span>
                  <span className="workspace-card-title">
                    {project.name}
                    {project.favorite ? <Star className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-amber-500" fill="currentColor" /> : null}
                  </span>
                  <span className="workspace-card-desc">{project.businessType || "Без указанного типа бизнеса"}</span>
                  <span className="workspace-card-meta">
                    {progress.completedCount}/{progress.totalCount} разделов · {formatProjectDate(project.updatedAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : isLoaded ? (
        <section>
          <p className="workspace-section-label">Проекты</p>
          <WorkspaceEmptyState
            icon={FolderKanban}
            title="Проектов пока нет"
            description="Опишите бизнес на главной странице AEVIX или создайте новый проект — он появится здесь со всем, что вы в нём соберёте."
            action={
              <button type="button" className="workspace-topbar-action" aria-label="Новый проект" onClick={() => createAndOpen({ name: "Новый проект", businessType: "", businessDescription: "" })}>
                <Sparkles className="h-4 w-4" />
                <span>Создать первый проект</span>
              </button>
            }
          />
        </section>
      ) : null}

      {favorites.length ? (
        <section>
          <p className="workspace-section-label">Избранное</p>
          <div className="workspace-card-grid">
            {favorites.map((project) => (
              <Link key={project.id} href={projectHref(project.id)} className="workspace-card">
                <span className="workspace-card-icon">
                  <Star className="h-5 w-5" fill="currentColor" />
                </span>
                <span className="workspace-card-title">{project.name}</span>
                <span className="workspace-card-desc">{project.businessType || "Без указанного типа бизнеса"}</span>
                <span className="workspace-card-meta">обновлён {formatProjectDate(project.updatedAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
