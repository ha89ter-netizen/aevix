import type { EcosystemMode, Vec3 } from "./types";

/**
 * The scene's LAYOUT, kept deliberately separate from its CONTENT (data.ts). Every coordinate is
 * derived from this one composition — never from Math.random(), never from elapsed time, and no
 * longer from a wall of hand-typed vectors that could (and did) drift into overlaps.
 *
 * The design idea is "controlled chaos", not accidental scatter:
 *
 *  - Every node owns a fixed angular SLOT on an ellipse, evenly spaced (360/5 = 72° apart), with
 *    a vertex at the top. Slots never change between before/after, so two nodes can never drift
 *    into each other or stack their labels.
 *  - "before" expresses disorder through DISTANCE and DEPTH, not through angle: each slot gets a
 *    designed radius multiplier, depth offset and a small (<= 6°) angular lean. The ring is still
 *    legible as a ring; it just reads as loose and unsettled.
 *  - "after" collapses every one of those deviations to zero — one exact ellipse at depth 0. The
 *    transformation is therefore a visible tidy-up between two known compositions.
 *
 * Each device gets its own ellipse, sphere scale and camera distance rather than a scaled-down
 * copy of the desktop layout: a phone is not a small desktop, and the constraint that actually
 * matters there (label width against viewport width) is completely different.
 */

export type EcosystemDevice = "desktop" | "tablet" | "mobile";

type DeviceComposition = {
  /** Ellipse radii for the satellite ring, in world units. */
  rx: number;
  ry: number;
  /** Sphere radii. The core is always clearly dominant (>= 2x a satellite). */
  coreScale: number;
  satelliteScale: number;
  /** Overview camera. Framed so the topmost sphere keeps clear air above it: the ring's vertical
   * radius is deliberately smaller than the raw viewport budget, because the core breathes and
   * the satellites sway a few hundredths of a unit on top of their fixed slots. */
  camera: { position: Vec3; target: Vec3 };
  /** How far the camera sits from a node when focused. */
  focusDistance: number;
};

const COMPOSITION: Record<EcosystemDevice, DeviceComposition> = {
  // Wide and shallow: uses the horizontal room a desktop viewport actually has.
  desktop: {
    rx: 2.45,
    ry: 2.1,
    coreScale: 1.15,
    satelliteScale: 0.62,
    camera: { position: [0, 0.25, 8.5], target: [0, 0, 0] },
    focusDistance: 3.6,
  },
  // Nearly circular: a tablet is close to square, so the ring is too.
  tablet: {
    rx: 2.35,
    ry: 2.15,
    coreScale: 1.05,
    satelliteScale: 0.56,
    camera: { position: [0, 0.2, 8.8], target: [0, 0, 0] },
    focusDistance: 3.9,
  },
  // Tall and narrow, with smaller spheres: on a portrait screen the binding constraint is label
  // width against viewport width, so horizontal reach is bought back as vertical reach.
  mobile: {
    rx: 2.05,
    ry: 2.15,
    coreScale: 0.9,
    satelliteScale: 0.42,
    camera: { position: [0, 0, 8.5], target: [0, 0, 0] },
    focusDistance: 3.4,
  },
};

/** Even 72° slots with a vertex at the top — the order matches `ecosystemProcesses`. */
const SLOT_ANGLES_DEG = [90, 18, -54, -126, 162] as const;

/**
 * Per-slot deviation applied ONLY in the "before" state. Hand-designed (not generated) so the
 * loose composition stays balanced: the radius multipliers sum to roughly 1 across the ring, and
 * the depth offsets alternate so the group never leans to one side. The angular lean is capped at
 * 6°, which keeps the worst-case gap between neighbours at 60° — wide enough that neither the
 * spheres nor their labels can meet.
 */
const BEFORE_DEVIATION = [
  { leanDeg: 5, radius: 1.1, depth: 0.55 },
  { leanDeg: -6, radius: 0.92, depth: -0.45 },
  { leanDeg: 4, radius: 1.07, depth: 0.32 },
  { leanDeg: -4, radius: 0.94, depth: -0.34 },
  { leanDeg: 6, radius: 1.12, depth: 0.46 },
] as const;

export function ecosystemComposition(device: EcosystemDevice): DeviceComposition {
  return COMPOSITION[device];
}

/** The fixed world position of one node, for a device and a mode. */
export function ecosystemPosition(index: number, device: EcosystemDevice, mode: EcosystemMode): Vec3 {
  const { rx, ry } = COMPOSITION[device];
  const slot = SLOT_ANGLES_DEG[index % SLOT_ANGLES_DEG.length];
  const deviation = BEFORE_DEVIATION[index % BEFORE_DEVIATION.length];

  const isBefore = mode === "before";
  const angle = ((slot + (isBefore ? deviation.leanDeg : 0)) * Math.PI) / 180;
  const spread = isBefore ? deviation.radius : 1;
  const depth = isBefore ? deviation.depth : 0;

  return [
    Number((Math.cos(angle) * rx * spread).toFixed(3)),
    Number((Math.sin(angle) * ry * spread).toFixed(3)),
    depth,
  ];
}

/** Every node position for one device/mode — used by the transform timeline. */
export function ecosystemPositions(count: number, device: EcosystemDevice, mode: EcosystemMode): Vec3[] {
  return Array.from({ length: count }, (_, index) => ecosystemPosition(index, device, mode));
}
