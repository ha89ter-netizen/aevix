import type { Project } from "./projects";
import { conceptColors, conceptStyles, type ConceptColorId, type ConceptStyleId } from "./website-concept";

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

const knownStyleIds = new Set<string>(conceptStyles.map((style) => style.id));
const knownColorIds = new Set<string>(conceptColors.map((color) => color.id));

/**
 * Normalizing instead of strictly validating: id/name/timestamps are required (a project without
 * them can't render safely), everything else falls back to a sane default. That way projects
 * saved by an OLDER version of the app (before city/style/color preferences existed) load intact
 * instead of being dropped — the "no data loss after refresh" rule extends across app updates.
 * Nested analysis/design/pricing are only checked for "null or object" — they're written
 * exclusively by our own app and already validated at their source.
 */
function normalizeProject(value: unknown): Project | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !value.id) return null;
  if (typeof value.name !== "string" || !value.name) return null;
  if (typeof value.createdAt !== "number" || typeof value.updatedAt !== "number") return null;

  // Accepts both shapes: the current array and the single `preferredStyleId` written before the
  // briefing allowed up to three, so older projects keep the style they were created with.
  const rawStyles = Array.isArray(value.preferredStyleIds)
    ? value.preferredStyleIds
    : typeof value.preferredStyleId === "string"
      ? [value.preferredStyleId]
      : [];
  const preferredStyleIds = rawStyles
    .filter((id): id is ConceptStyleId => typeof id === "string" && knownStyleIds.has(id))
    .slice(0, 3);
  const preferredColorIds = Array.isArray(value.preferredColorIds)
    ? (value.preferredColorIds.filter((id): id is ConceptColorId => typeof id === "string" && knownColorIds.has(id)))
    : [];

  return {
    id: value.id,
    name: value.name,
    businessType: typeof value.businessType === "string" ? value.businessType : "",
    businessDescription: typeof value.businessDescription === "string" ? value.businessDescription : "",
    city: typeof value.city === "string" ? value.city : "",
    preferredStyleIds,
    preferredColorIds,
    generatedAt: typeof value.generatedAt === "number" ? value.generatedAt : null,
    publishedAt: typeof value.publishedAt === "number" ? value.publishedAt : null,
    // Older projects predate the AI Designer and simply start with an empty history.
    designerLog: Array.isArray(value.designerLog)
      ? (value.designerLog.filter(
          (entry): entry is Project["designerLog"][number] =>
            isRecord(entry) && typeof entry.id === "string" && typeof entry.request === "string",
        ))
      : [],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    analysis: isRecord(value.analysis) ? (value.analysis as Project["analysis"]) : null,
    design: isRecord(value.design) ? (value.design as Project["design"]) : null,
    pricing: isRecord(value.pricing) ? (value.pricing as Project["pricing"]) : null,
  };
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

  return parsed.projects.map(normalizeProject).filter((project): project is Project => project !== null);
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
