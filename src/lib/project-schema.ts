import type { Project } from "./projects";
import { businessKnowledgeFor } from "./business-knowledge";
import {
  conceptColors,
  dedupeConceptSections,
  conceptGoals,
  conceptSectionOptions,
  conceptStyles,
  type ConceptColorId,
  type ConceptGoal,
  type ConceptSectionType,
  type ConceptStyleId,
} from "./website-concept";

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
const knownGoals = new Set<string>(conceptGoals);
const knownSectionTypes = new Set<string>(conceptSectionOptions.map((option) => option.id));
/** Названия по умолчанию для разделов, поднятых из старой формы записи. */
const DEFAULT_SECTION_TITLES = Object.fromEntries(
  conceptSectionOptions.map((option) => [option.id, option.label]),
) as Record<ConceptSectionType, string>;

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
  // Задача и разделы появились позже: у проектов, созданных раньше, их просто нет, и пустой
  // массив здесь — не потеря данных, а честное «не спрашивали».
  const goals = Array.isArray(value.goals)
    ? (value.goals.filter((goal): goal is ConceptGoal => typeof goal === "string" && knownGoals.has(goal)))
    : [];
  /**
   * Разделы читаются в двух формах. Старая — просто массив типов, какой писали, пока структуру
   * не спрашивали, а отмечали галочками. Новая — упорядоченный список с названиями, появившийся
   * вместе с правкой структуры в мастере.
   *
   * Старая форма поднимается до новой с названием по умолчанию, а не отбрасывается: у проекта,
   * созданного вчера, разделы должны остаться на месте.
   */
  const sections: Project["sections"] = Array.isArray(value.sections)
    ? value.sections
        .map((item) => {
          if (typeof item === "string") {
            return knownSectionTypes.has(item)
              ? { type: item as ConceptSectionType, title: DEFAULT_SECTION_TITLES[item as ConceptSectionType] }
              : null;
          }
          if (!isRecord(item) || typeof item.type !== "string" || !knownSectionTypes.has(item.type)) return null;
          const type = item.type as ConceptSectionType;
          const title = typeof item.title === "string" && item.title.trim() ? item.title.trim().slice(0, 60) : DEFAULT_SECTION_TITLES[type];
          return { type, title };
        })
        .filter((section): section is Project["sections"][number] => section !== null)
    : [];

  return {
    id: value.id,
    name: value.name,
    businessType: typeof value.businessType === "string" ? value.businessType : "",
    businessDescription: typeof value.businessDescription === "string" ? value.businessDescription : "",
    city: typeof value.city === "string" ? value.city : "",
    preferredStyleIds,
    preferredColorIds,
    goals,
    sections,
    wishes: typeof value.wishes === "string" ? value.wishes : "",
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
    // Концепт чистится от повторов и при чтении, а не только при создании: проекты, созданные
    // до появления правила, иначе таскали бы дубль вечно — он пережил бы и перезагрузку, и
    // отмену правки. Чистка идемпотентна, поэтому лишний прогон ничего не портит.
    design: isRecord(value.design) ? normalizeDesign(value.design as NonNullable<Project["design"]>) : null,
    pricing: isRecord(value.pricing) ? (value.pricing as Project["pricing"]) : null,
    // Older projects have no stored history; they simply start with an empty stack.
    editHistory: Array.isArray(value.editHistory) ? (value.editHistory as Project["editHistory"]).slice(-20) : [],
    redoHistory: Array.isArray(value.redoHistory) ? (value.redoHistory as Project["redoHistory"]).slice(-20) : [],
  };
}

/** Убирает из сохранённого концепта повторяющиеся по смыслу секции. */
function normalizeDesign(design: NonNullable<Project["design"]>): NonNullable<Project["design"]> {
  if (!Array.isArray(design.pages)) return design;
  const knowledge = businessKnowledgeFor(design.businessType ?? "", design.businessName ?? "");
  const hasProducts = (design.offers?.products ?? knowledge.products).length > 0;
  return dedupeConceptSections(design, hasProducts);
}

/** Нормализует список, отбрасывая то, что проектом не является. */
export function normalizeProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeProject).filter((project): project is Project => project !== null);
}
