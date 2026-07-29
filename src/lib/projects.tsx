"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * The central object of the Workspace. Every generated business artifact — a Design Studio
 * concept today, a saved AI Consultant analysis or pricing estimate later — becomes a Project
 * so the Dashboard, Projects list, and future features (export, collaborate) all work off one
 * shape instead of each feature inventing its own "saved item".
 */
export type ProjectKind = "design-concept" | "business-analysis" | "pricing-estimate";

export type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  /** Short, human-readable line for cards/lists — e.g. the business type or a one-line summary. */
  summary: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CreateProjectInput = {
  name: string;
  kind: ProjectKind;
  summary: string;
};

type ProjectsContextValue = {
  projects: Project[];
  /** Most recently touched first — what "Recent" filters/sorts by, no separate storage needed. */
  recent: Project[];
  favorites: Project[];
  create: (input: CreateProjectInput) => Project;
  rename: (id: string, name: string) => void;
  duplicate: (id: string) => Project | null;
  remove: (id: string) => void;
  toggleFavorite: (id: string) => void;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `project-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * In-session only for now — real persistence (a database, or at minimum localStorage) is a
 * follow-up, not implemented here so we don't ship a data shape that then has to migrate. Every
 * consumer goes through `useProjects()`, so swapping this provider's internals for a persisted
 * store later requires no changes to any page that reads/writes projects.
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);

  const create = useCallback((input: CreateProjectInput) => {
    const now = Date.now();
    const project: Project = {
      id: createId(),
      name: input.name,
      kind: input.kind,
      summary: input.summary,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    setProjects((current) => [project, ...current]);
    return project;
  }, []);

  const rename = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProjects((current) =>
      current.map((project) => (project.id === id ? { ...project, name: trimmed, updatedAt: Date.now() } : project)),
    );
  }, []);

  const duplicate = useCallback(
    (id: string) => {
      const source = projects.find((project) => project.id === id);
      if (!source) return null;
      const now = Date.now();
      const copy: Project = { ...source, id: createId(), name: `${source.name} (копия)`, favorite: false, createdAt: now, updatedAt: now };
      setProjects((current) => [copy, ...current]);
      return copy;
    },
    [projects],
  );

  const remove = useCallback((id: string) => {
    setProjects((current) => current.filter((project) => project.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setProjects((current) =>
      current.map((project) => (project.id === id ? { ...project, favorite: !project.favorite, updatedAt: Date.now() } : project)),
    );
  }, []);

  const value = useMemo<ProjectsContextValue>(() => {
    const byRecency = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      projects,
      recent: byRecency.slice(0, 5),
      favorites: projects.filter((project) => project.favorite),
      create,
      rename,
      duplicate,
      remove,
      toggleFavorite,
    };
  }, [projects, create, rename, duplicate, remove, toggleFavorite]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const value = useContext(ProjectsContext);
  if (!value) throw new Error("useProjects must be used within a ProjectsProvider");
  return value;
}
