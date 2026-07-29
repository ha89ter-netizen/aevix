import type { Project } from "./projects";

/**
 * The only place that touches localStorage for projects. Everything else goes through
 * `useProjects()`, so this file is the single seam a real backend replaces later — every method
 * here keeps the exact same signature a server-backed version would have (load/save/clear).
 */
const STORAGE_KEY = "aevix.projects";
const STORAGE_VERSION = 1;

type StoredEnvelope = {
  version: number;
  projects: Project[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Deliberately shallow: id/name/timestamps/favorite are checked strictly (a corrupt project
 * without these can't render safely), while analysis/design/pricing are only checked for
 * "null or object" — they're written exclusively by our own app (AI responses already validated
 * server-side, concepts already validated by website-concept.ts), so a full re-validation of
 * every nested field here would just duplicate that work for no real safety gain.
 */
function isPlausibleProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id) return false;
  if (typeof value.name !== "string") return false;
  if (typeof value.businessType !== "string") return false;
  if (typeof value.businessDescription !== "string") return false;
  if (typeof value.favorite !== "boolean") return false;
  if (typeof value.createdAt !== "number" || typeof value.updatedAt !== "number") return false;
  if (value.analysis !== null && !isRecord(value.analysis)) return false;
  if (value.design !== null && !isRecord(value.design)) return false;
  if (value.pricing !== null && !isRecord(value.pricing)) return false;
  return true;
}

function parseEnvelope(raw: string): Project[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.projects)) return [];
  // No migration path exists yet for older/newer versions — an unexpected version is treated
  // like corrupt data (dropped) rather than risk shape mismatches from a future format.
  if (parsed.version !== STORAGE_VERSION) return [];

  return parsed.projects.filter(isPlausibleProject);
}

export const projectRepository = {
  /** Never called during SSR — every caller guards with `typeof window !== "undefined"` first
   * (or, in practice, only calls this from a useEffect, which never runs on the server). */
  load(): Project[] {
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

  save(projects: Project[]) {
    if (typeof window === "undefined") return;
    try {
      const envelope: StoredEnvelope = { version: STORAGE_VERSION, projects };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // Same fail-open policy as load(): a write failure shouldn't crash the app, it just
      // means this change won't survive a refresh.
    }
  },

  clear() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
