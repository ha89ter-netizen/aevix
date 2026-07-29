"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, FolderKanban, Pencil, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects, type Project } from "@/lib/projects";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { WorkspaceEmptyState } from "@/components/workspace/empty-state";
import { projectKindMeta, formatProjectDate } from "@/components/workspace/project-meta";

const tabs = [
  { id: "all", label: "Все" },
  { id: "favorites", label: "Избранное" },
  { id: "recent", label: "Недавние" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function ProjectsPage() {
  const { projects, favorites, recent, rename, duplicate, remove, toggleFavorite } = useProjects();
  const [tab, setTab] = useState<TabId>("all");

  const visible = useMemo<Project[]>(() => {
    if (tab === "favorites") return favorites;
    if (tab === "recent") return recent;
    return projects;
  }, [tab, projects, favorites, recent]);

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        title="Проекты"
        description="Каждый концепт, анализ и расчёт, собранный в AEVIX, живёт здесь — с возможностью переименовать, дублировать или удалить."
      />

      <div className="workspace-tabs" role="tablist" aria-label="Фильтр проектов">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn("workspace-tab", tab === item.id && "is-active")}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === "favorites" && favorites.length ? <span>{favorites.length}</span> : null}
          </button>
        ))}
      </div>

      {visible.length ? (
        <ul className="workspace-project-list">
          {visible.map((project) => {
            const meta = projectKindMeta[project.kind];
            const Icon = meta.icon;
            return (
              <li key={project.id} className="workspace-project-row">
                <Link href={meta.href} className="workspace-project-row-main">
                  <span className="workspace-card-icon">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="workspace-project-row-name">{project.name}</span>
                    <span className="workspace-project-row-meta">
                      {meta.label} · обновлён {formatProjectDate(project.updatedAt)}
                    </span>
                  </span>
                </Link>
                <div className="workspace-project-row-actions">
                  <button
                    type="button"
                    className={cn("workspace-icon-button", project.favorite && "is-active")}
                    onClick={() => toggleFavorite(project.id)}
                    aria-label={project.favorite ? "Убрать из избранного" : "Добавить в избранное"}
                    title={project.favorite ? "Убрать из избранного" : "В избранное"}
                  >
                    <Star className="h-4 w-4" fill={project.favorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    className="workspace-icon-button"
                    onClick={() => {
                      const next = window.prompt("Новое название проекта", project.name);
                      if (next) rename(project.id, next);
                    }}
                    aria-label="Переименовать"
                    title="Переименовать"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="workspace-icon-button"
                    onClick={() => duplicate(project.id)}
                    aria-label="Дублировать"
                    title="Дублировать"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="workspace-icon-button"
                    onClick={() => remove(project.id)}
                    aria-label="Удалить"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <WorkspaceEmptyState
          icon={FolderKanban}
          title={tab === "all" ? "Проектов пока нет" : tab === "favorites" ? "Нет избранных проектов" : "Нет недавних проектов"}
          description={
            tab === "all"
              ? "Начните с AI-консультанта, бизнес-анализа или дизайн-студии — первый результат станет вашим первым проектом."
              : "Отметьте проект звездой или создайте новый — он появится здесь."
          }
        />
      )}
    </div>
  );
}
