import type { Project } from "./projects";
import { normalizeProjects } from "./project-schema";

/**
 * The single seam between the app and wherever projects are stored.
 *
 * Everything else goes through `useProjects()`, so swapping the browser for a database means
 * writing one more implementation of `ProjectStore` and pointing the app at it — no page or
 * component changes.
 *
 * The methods are async even though the browser implementation answers instantly. That is the
 * whole point: a server round-trip cannot be made synchronous later, so the callers are written
 * to await from the start. Doing it the other way round would mean touching every caller on the
 * day the database arrives, which is exactly the migration this seam exists to avoid.
 *
 * Тот день настал, и оказалось, что реализация не одна, а две. Вошедший в аккаунт работает с
 * сервером, не вошедший — как и раньше, с браузером: Workspace никогда не требовал регистрации,
 * и требовать её теперь означало бы забрать у людей то, что уже работает. Отсюда `storeFor()`
 * вместо одной константы.
 */

/** Implement this to move projects off the device. See docs/database.md. */
export type ProjectStore = {
  load(): Promise<Project[]>;
  /** `signal` отменяет запрос, если сохранение вытеснено более новым состоянием (защита от
   *  устаревшего ответа, который иначе перезаписал бы актуальное состояние). */
  save(projects: Project[], signal?: AbortSignal): Promise<void>;
  clear(): Promise<void>;
};
const STORAGE_KEY = "aevix.projects";
const STORAGE_VERSION = 1;

type StoredEnvelope = {
  version: number;
  projects: Project[];
};

function parseEnvelope(raw: string): Project[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (typeof parsed !== "object" || parsed === null) return [];
  const envelope = parsed as Partial<StoredEnvelope>;
  if (!Array.isArray(envelope.projects)) return [];
  // No migration path exists yet for older/newer versions — an unexpected version is treated
  // like corrupt data (dropped) rather than risk shape mismatches from a future format.
  if (envelope.version !== STORAGE_VERSION) return [];

  return normalizeProjects(envelope.projects);
}

/** The device-local store: what ships today, and the offline fallback once a server exists. */
export const localProjectStore: ProjectStore = {
  /** Never called during SSR — callers only invoke this from an effect. */
  async load(): Promise<Project[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return parseEnvelope(raw);
    } catch {
      // Storage disabled (private mode, quota, etc.) — fail open with an empty list rather
      // than throw and break the app.
      return [];
    }
  },

  async save(projects: Project[]): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const envelope: StoredEnvelope = { version: STORAGE_VERSION, projects };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // Same fail-open policy as load(): a write failure shouldn't crash the app, it just
      // means this change won't survive a refresh.
    }
  },

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

/**
 * Серверное хранилище: ходит на свои же маршруты, а не в базу напрямую — строка подключения
 * не должна оказаться в браузере.
 *
 * Ошибка чтения возвращает пустой список, но НЕ приводит к записи: провайдер сохраняет только
 * то, что сам изменил, а «загрузилось пусто» изменением не считается. Иначе одна неудачная
 * загрузка стёрла бы человеку все проекты на сервере.
 */
export const serverProjectStore: ProjectStore = {
  async load(): Promise<Project[]> {
    const response = await fetch("/api/projects", { cache: "no-store" });
    if (!response.ok) throw new Error("Не удалось загрузить проекты");
    const data = (await response.json()) as { projects?: unknown };
    return normalizeProjects(data.projects);
  },

  async save(projects: Project[], signal?: AbortSignal): Promise<void> {
    const response = await fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects }),
      signal,
    });
    if (!response.ok) throw new Error("Не удалось сохранить проекты");
  },

  async clear(): Promise<void> {
    const response = await fetch("/api/projects", { method: "DELETE" });
    if (!response.ok) throw new Error("Не удалось очистить проекты");
  },
};

/** Хранилище для текущего состояния входа. Единственное место, где делается этот выбор. */
export function storeFor(signedIn: boolean): ProjectStore {
  return signedIn ? serverProjectStore : localProjectStore;
}

/**
 * Reads whatever is on this device, for a one-time hand-off into an account on first sign-in.
 * Without this the day authentication ships is the day everyone's existing work disappears —
 * the migration matters more than the storage swap itself.
 */
export async function readLocalProjectsForMigration(): Promise<Project[]> {
  return localProjectStore.load();
}

/** Убирает локальную копию — вызывается ТОЛЬКО после подтверждённой записи на сервер. */
export async function clearLocalProjectsAfterMigration(): Promise<void> {
  return localProjectStore.clear();
}
