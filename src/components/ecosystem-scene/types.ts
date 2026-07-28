import type { ComponentType } from "react";

export type EcosystemIconComponent = ComponentType<{ className?: string }>;

export type EcosystemMode = "before" | "after";

export type Vec3 = readonly [number, number, number];

/**
 * One fixed point in the scene. Every coordinate here is a literal, explicit constant — never
 * derived from Math.random() or from per-frame elapsed time. "before" and "after" positions are
 * two distinct, hand-designed compositions (deliberately slightly uneven vs. a clean, even
 * pentagon) so the before->after toggle can visibly "tidy up" the layout by tweening between two
 * known points, not by procedurally perturbing anything.
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
  /** Fixed desktop position, before and after the transformation. */
  desktopPosition: { before: Vec3; after: Vec3 };
  /** Fixed mobile position — a separate, hand-authored composition, not a scaled desktop layout. */
  mobilePosition: { before: Vec3; after: Vec3 };
};
