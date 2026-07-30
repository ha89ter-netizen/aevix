import type { ComponentType } from "react";

export type EcosystemIconComponent = ComponentType<{ className?: string }>;

export type EcosystemMode = "before" | "after";

export type Vec3 = readonly [number, number, number];

/**
 * One process in the scene — pure content. Its position comes from composition.ts, which derives
 * every coordinate from one deterministic, hand-designed composition (never Math.random(), never
 * elapsed time), so before/after remains a tween between two known layouts.
 */
export type EcosystemProcessData = {
  id: string;
  icon: EcosystemIconComponent;
  /** Short, always-visible label (billboarded, never inside the sphere). */
  title: { before: string; after: string };
  /** One-line caption shown under the persistent label. */
  caption: { before: string; after: string };
  /** Full paragraph shown in the detail panel once focused. */
  description: { before: string; after: string };
  /** Optional single-line risk/highlight shown under the description. */
  highlight?: { before?: string; after?: string };
};
