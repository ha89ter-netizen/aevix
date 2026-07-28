"use client";

import { Html } from "@react-three/drei";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { ComponentType } from "react";

/**
 * The info card for a focused node. Rendered via drei's <Html> as a child of that node's own
 * <group>, in default screen-space billboard mode (not the 3D-perspective `transform` mode,
 * which is measurably more expensive per frame and flaky combined with backdrop-filter blur on
 * Safari) — so it tracks the sphere's projected screen position every frame while staying real
 * DOM/CSS underneath (for text layout, blur, and focus handling). Mounted only while a node is
 * focused, never one per node kept invisible.
 */

type EcosystemDetailPanelProps = {
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  label: string;
  text: string;
  onClose: () => void;
};

type EcosystemDetailPanelExtraProps = {
  highlight?: string;
};

export function EcosystemDetailPanel({
  icon: Icon,
  eyebrow,
  label,
  text,
  highlight,
  onClose,
}: EcosystemDetailPanelProps & EcosystemDetailPanelExtraProps) {
  return (
    <Html center zIndexRange={[10, 0]} pointerEvents="none">
      <div className="ecosystem-3d-panel-anchor">
        <span className="ecosystem-3d-panel-stem" aria-hidden="true" />
        <motion.div
          className="ecosystem-3d-panel"
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: "auto" }}
        >
          <button type="button" className="ecosystem-3d-panel-close" onClick={onClose} aria-label="Закрыть">
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="ecosystem-3d-panel-icon">
            <Icon className="h-4 w-4" />
          </span>
          <p className="ecosystem-3d-panel-eyebrow">{eyebrow}</p>
          <h3 className="ecosystem-3d-panel-title">{label}</h3>
          <p className="ecosystem-3d-panel-text">{text}</p>
          {highlight ? <p className="ecosystem-3d-panel-highlight">{highlight}</p> : null}
        </motion.div>
      </div>
    </Html>
  );
}
