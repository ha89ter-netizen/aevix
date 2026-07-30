/**
 * The single source of truth for AEVIX motion.
 *
 * The easing curves were already consistent across the app; the durations were not — CSS carried
 * fifteen distinct values (180/200/220/240/260/280/300/320/360/380/460/600/700/800/950ms) and the
 * React side carried fifteen more, for what are really only five semantic speeds. Timings that
 * close together are indistinguishable individually but read as sloppiness collectively: two
 * cards that lift at 220ms and 240ms feel subtly unsynchronised without the viewer knowing why.
 *
 * Everything animated now picks a step on this scale. The same numbers are exported for CSS
 * (custom properties in globals.css), Framer Motion (seconds) and GSAP, so a value can never
 * drift between the three systems.
 */

/** Milliseconds — matches the `--motion-*` custom properties in globals.css exactly. */
export const durationMs = {
  /** Micro-feedback on small controls: colour, opacity, icon tint. */
  fast: 180,
  /** The default: hover states, buttons, chips, inputs. */
  base: 220,
  /** Movement with distance: cards lifting, rows expanding, tabs sliding. */
  slow: 320,
  /** Whole surfaces: modals, panels, scene pieces entering or leaving. */
  slower: 480,
  /** Ambient, barely-noticed change: theme crossfades, long reveals. */
  ambient: 700,
} as const;

/** Seconds — the same scale, for Framer Motion and GSAP. */
export const duration = {
  fast: durationMs.fast / 1000,
  base: durationMs.base / 1000,
  slow: durationMs.slow / 1000,
  slower: durationMs.slower / 1000,
  ambient: durationMs.ambient / 1000,
} as const;

/**
 * Easing. `premium` is the house curve — a decisive start that settles softly — and is what the
 * overwhelming majority of the app already used. `soft` is for long ambient drifts, `spring` for
 * the few places where a small overshoot reads as responsive rather than bouncy.
 */
export const easeCubic = {
  premium: [0.22, 1, 0.36, 1],
  soft: [0.16, 1, 0.3, 1],
  spring: [0.34, 1.56, 0.64, 1],
} as const;

/** GSAP's named equivalents of the curves above, so tweens match CSS/Framer instead of
 * approximating them with whatever `power` value was nearest to hand. */
export const easeGsap = {
  premium: "power3.out",
  soft: "power2.out",
  inOut: "power2.inOut",
} as const;

/** Framer Motion transition presets — import these instead of writing `{ duration: 0.34 }`. */
export const motionTransition = {
  fast: { duration: duration.fast, ease: easeCubic.premium },
  base: { duration: duration.base, ease: easeCubic.premium },
  slow: { duration: duration.slow, ease: easeCubic.premium },
  slower: { duration: duration.slower, ease: easeCubic.premium },
  ambient: { duration: duration.ambient, ease: easeCubic.soft },
} as const;

/** Stagger step between siblings revealing in sequence. One value, so every list, grid and
 * reveal cascade shares a rhythm. */
export const staggerStep = 0.055;
