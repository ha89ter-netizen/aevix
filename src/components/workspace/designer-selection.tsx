"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { conceptSectionOptions, type ConceptSectionType } from "@/lib/website-concept";

/**
 * Which part of the site the designer is currently working on.
 *
 * The concept preview and the AI Designer panel are mounted in different places in the tree (the
 * preview lives inside the Design page, the panel inside the project layout), so the selection
 * has to live above both. Keeping it in context rather than passing props also means a later
 * surface — an outline view, a section list — can read the same selection without rewiring.
 *
 * Selection is intentionally session state, not project data: it describes what someone is
 * looking at right now, not anything about the project itself.
 */

export type SelectedSection = { type: ConceptSectionType; label: string } | null;

type SelectionValue = {
  selected: SelectedSection;
  select: (section: SelectedSection) => void;
  /** Section currently being rewritten by an edit, for the live highlight. */
  editing: ConceptSectionType | null;
  setEditing: (section: ConceptSectionType | null) => void;
};

const SelectionContext = createContext<SelectionValue | null>(null);

export function DesignerSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<SelectedSection>(null);
  const [editing, setEditing] = useState<ConceptSectionType | null>(null);

  const select = useCallback((section: SelectedSection) => {
    // Clicking the active section again clears it — the same affordance both ways.
    setSelected((current) => (current && section && current.type === section.type ? null : section));
  }, []);

  const value = useMemo(() => ({ selected, select, editing, setEditing }), [selected, select, editing]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

/** Returns null outside a project, so the landing's own concept preview stays unaffected. */
export function useDesignerSelection(): SelectionValue | null {
  return useContext(SelectionContext);
}

/** Derived from the single list of section options rather than retyped — a second hand-written
 * copy of these labels would drift the moment one of them is renamed. */
export const SECTION_LABELS = Object.fromEntries(
  conceptSectionOptions.map((option) => [option.id, option.label]),
) as Record<ConceptSectionType, string>;

/** The one-click improvements offered for a section. Each maps to a real designer intent. */
export const SECTION_IMPROVEMENTS: Array<{ label: string; request: string }> = [
  { label: "Улучшить типографику", request: "Улучши типографику" },
  { label: "Сделать темнее", request: "Сделай темнее" },
  { label: "Сделать светлее", request: "Сделай светлее" },
  { label: "Сменить макет", request: "Смени макет" },
];
