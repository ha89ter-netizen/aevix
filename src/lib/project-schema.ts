import type { Project } from "./projects";
import { conceptColors, conceptStyles, type ConceptColorId, type ConceptStyleId } from "./website-concept";

/**
 * Что считается проектом. Один модуль на всё приложение, потому что проверять форму приходится
 * в двух местах: при чтении из браузера и при приёме от клиента на сервере. Две отдельные
 * реализации разъехались бы — и разъехались бы молча, а цена такого расхождения здесь равна
 * потерянной работе клиента.
 */

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
export function normalizeProject(value: unknown): Project | null {
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
    // Older projects have no stored history; they simply start with an empty stack.
    editHistory: Array.isArray(value.editHistory) ? (value.editHistory as Project["editHistory"]).slice(-20) : [],
    redoHistory: Array.isArray(value.redoHistory) ? (value.redoHistory as Project["redoHistory"]).slice(-20) : [],
  };
}

/** Нормализует список, отбрасывая то, что проектом не является. */
export function normalizeProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeProject).filter((project): project is Project => project !== null);
}
