"use client";

import Link from "next/link";
import { ArrowRight, Bot, FolderKanban, LineChart, Palette, Sparkles, Wallet } from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { useProjects } from "@/lib/projects";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { WorkspaceEmptyState } from "@/components/workspace/empty-state";
import { projectKindMeta, formatProjectDate } from "@/components/workspace/project-meta";

const quickActions = [
  {
    href: "/app/ai-consultant",
    icon: Bot,
    title: "AI-консультант",
    desc: "Опишите ситуацию и получите прямой ответ, а не отчёт.",
  },
  {
    href: "/app/business-analysis",
    icon: LineChart,
    title: "Бизнес-анализ",
    desc: "Распознать нишу, получить метрики и дорожную карту.",
  },
  {
    href: "/app/design-studio",
    icon: Palette,
    title: "Дизайн-студия",
    desc: "Собрать интерактивный концепт сайта под бизнес.",
  },
  {
    href: "/app/pricing",
    icon: Wallet,
    title: "Расчёт стоимости",
    desc: "Пошагово собрать персональную смету проекта.",
  },
] as const;

export default function DashboardPage() {
  const { status, profile } = useBusiness();
  const { recent } = useProjects();
  const personalized = status === "ready" && profile;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        title={personalized ? `С возвращением, ${profile.label.toLowerCase()}` : "Дашборд"}
        description={
          personalized
            ? "Вот что можно сделать дальше с вашим бизнесом."
            : "Опишите бизнес в AI-консультанте или бизнес-анализе — и дашборд станет вашим."
        }
        actions={
          <Link href="/app/design-studio" className="workspace-topbar-action">
            <Sparkles className="h-4 w-4" />
            <span>Новый концепт</span>
          </Link>
        }
      />

      <section>
        <p className="workspace-section-label">Быстрые действия</p>
        <div className="workspace-card-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="workspace-card">
                <span className="workspace-card-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="workspace-card-title">{action.title}</span>
                <span className="workspace-card-desc">{action.desc}</span>
                <span className="workspace-card-meta">
                  Открыть <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="workspace-section-head">
          <p className="workspace-section-label">Недавние проекты</p>
          {recent.length ? (
            <Link href="/app/projects" className="workspace-section-link">
              Все проекты
            </Link>
          ) : null}
        </div>
        {recent.length ? (
          <div className="workspace-card-grid">
            {recent.map((project) => {
              const meta = projectKindMeta[project.kind];
              const Icon = meta.icon;
              return (
                <Link key={project.id} href={meta.href} className="workspace-card">
                  <span className="workspace-card-icon">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="workspace-card-title">{project.name}</span>
                  <span className="workspace-card-desc">{project.summary || meta.label}</span>
                  <span className="workspace-card-meta">
                    {meta.label} · {formatProjectDate(project.updatedAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <WorkspaceEmptyState
            icon={FolderKanban}
            title="Проектов пока нет"
            description="Каждый собранный концепт, анализ или расчёт появится здесь и станет проектом, который можно переименовать, дублировать или продолжить."
            action={
              <Link href="/app/design-studio" className="workspace-topbar-action">
                <Sparkles className="h-4 w-4" />
                <span>Создать первый проект</span>
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
