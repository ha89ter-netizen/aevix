"use client";

import { Html } from "@react-three/drei";

/**
 * The persistent, always-visible label for a node — mounted regardless of focus state, unlike
 * EcosystemDetailPanel. Uses drei's <Html> in its default screen-space mode, which is inherently
 * camera-facing (it's a flat DOM overlay projected to the object's screen position, never a
 * 3D-rotated plane), so it never has to fight rotation/tilt to stay readable, and it never
 * shakes with the sphere's own cosmetic micro-jitter because it's anchored to the stable outer
 * "slot" group, not the jittering inner one.
 */

type EcosystemLabelProps = {
  title: string;
  caption: string;
  dimmed: boolean;
  onClick: () => void;
};

export function EcosystemLabel({ title, caption, dimmed, onClick }: EcosystemLabelProps) {
  return (
    <Html center zIndexRange={[5, 0]} pointerEvents="none">
      <button
        type="button"
        className="ecosystem-node-label-tag"
        data-dimmed={dimmed ? "true" : "false"}
        style={{ pointerEvents: "auto" }}
        onClick={onClick}
      >
        <span className="ecosystem-node-label-title">{title}</span>
        <span className="ecosystem-node-label-caption">{caption}</span>
      </button>
    </Html>
  );
}
