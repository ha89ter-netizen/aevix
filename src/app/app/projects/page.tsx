"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, FolderKanban, MoreVertical, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects, getProjectStatus, type Project } from "@/lib/projects";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { projectHref } from "@/components/shell/shell-nav";
import { formatProjectDate } from "@/components/workspace/project-meta";

function ProjectCard({
  project,
  generatingId,
  onDuplicate,
  onRename,
  onDeleteRequest,
}: {
  project: Project;
  generatingId: string | null;
  onDuplicate: () => void;
  onRename: (name: string) => void;
  onDeleteRequest: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = getProjectStatus(project, generatingId);

  // Close on any click outside the menu — a dropdown that only closes via its own button
  // would trap the user.
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const commitRename = (value: string) => {
    onRename(value);
    setRenaming(false);
  };

  return (
    <article className="workspace-project-card">
      <div className="workspace-project-card-top">
        <span className="workspace-card-icon">
          <FolderKanban className="h-5 w-5" />
        </span>
        <span className={cn("workspace-status-badge", `is-${status.id}`)}>{status.label}</span>
        <div className="workspace-project-menu" ref={menuRef}>
          <button
            type="button"
            className="workspace-icon-button"
            aria-label={`Действия с проектом «${project.name}»`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="workspace-project-menu-list" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setRenaming(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Переименовать
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
              >
                <Copy className="h-4 w-4" />
                Дублировать
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteRequest();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {renaming ? (
        <input
          autoFocus
          defaultValue={project.name}
          className="workspace-project-card-rename"
          aria-label="Новое название проекта"
          onBlur={(event) => commitRename(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setRenaming(false);
          }}
        />
      ) : (
        <h3 className="workspace-project-card-name">{project.name}</h3>
      )}
      <p className="workspace-project-card-type">
        {[project.businessType || "Без категории", project.city].filter(Boolean).join(" · ")}
      </p>

      <dl className="workspace-project-card-dates">
        <div>
          <dt>Создан</dt>
          <dd>{formatProjectDate(project.createdAt)}</dd>
        </div>
        <div>
          <dt>Изменён</dt>
          <dd>{formatProjectDate(project.updatedAt)}</dd>
        </div>
      </dl>

      <Link href={projectHref(project.id)} className="workspace-project-card-open">
        Открыть
      </Link>
    </article>
  );
}

export default function ProjectsPage() {
  const { projects, isLoaded, rename, duplicate, remove, generation } = useProjects();
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        title="Проекты"
        description="Каждый бизнес в AEVIX — это проект: AI-анализ, дизайн, процесс и цены живут вместе и сохраняются между визитами."
      />

      <p className="workspace-storage-notice">
        <Smartphone className="h-3.5 w-3.5" />
        Проекты пока хранятся только на этом устройстве.
      </p>

      {projects.length ? (
        <div className="workspace-project-card-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              generatingId={generation?.projectId ?? null}
              onRename={(name) => rename(project.id, name)}
              onDuplicate={() => duplicate(project.id)}
              onDeleteRequest={() => setPendingDelete(project)}
            />
          ))}
        </div>
      ) : isLoaded ? (
        <div className="workspace-empty workspace-empty-hero">
          <span className="workspace-empty-icon">
            <FolderKanban className="h-6 w-6" />
          </span>
          <p className="workspace-empty-title">Здесь появится ваш первый проект</p>
          <p className="workspace-empty-desc">
            Расскажите о своём бизнесе — название, город, стиль и цвета — и AEVIX соберёт для него рабочее пространство:
            анализ, дизайн и расчёт стоимости в одном месте.
          </p>
          <Link href="/app/new" className="workspace-topbar-action">
            <Plus className="h-4 w-4" />
            <span>Создать первый проект</span>
          </Link>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="workspace-confirm-backdrop" role="presentation" onClick={() => setPendingDelete(null)}>
          <div
            className="workspace-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="delete-project-title" className="workspace-confirm-title">
              Удалить проект «{pendingDelete.name}»?
            </p>
            <p className="workspace-confirm-desc">
              Будут удалены все его данные: AI-анализ, дизайн и расчёт стоимости. Это действие нельзя отменить.
            </p>
            <div className="workspace-confirm-actions">
              <button type="button" className="workspace-confirm-cancel" onClick={() => setPendingDelete(null)}>
                Отмена
              </button>
              <button
                type="button"
                className="workspace-confirm-delete"
                onClick={() => {
                  remove(pendingDelete.id);
                  setPendingDelete(null);
                }}
              >
                Удалить проект
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
