"use client";

import { type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EcosystemMode, EcosystemProcessData } from "./types";
import { motionTransition } from "@/lib/motion";

/**
 * The original flat-CSS orb visualization (spokes + core + satellite divs via
 * rotate/translateX/rotate-back transforms). Kept, not deleted, as the deliberate fallback for
 * two cases where the real 3D scene must not run: prefers-reduced-motion (shown instead of the
 * WebGL scene, permanently) and the brief window while the 3D chunk is still downloading (shown
 * by next/dynamic's `loading`, then swapped out). Same prop shape as EcosystemScene so either can
 * be dropped in by EcosystemSceneLoader without the parent caring which one is mounted.
 */

const ANGLE_STEP = 360 / 5;
const START_ANGLE = -90;

export type EcosystemCssFallbackProps = {
  processes: EcosystemProcessData[];
  mode: EcosystemMode;
  activeId: string | null;
  onSelect: (id: string | null) => void;
};

export function EcosystemCssFallback({ processes, mode, activeId, onSelect }: EcosystemCssFallbackProps) {
  const activeNode = processes.find((node) => node.id === activeId) ?? null;

  return (
    <>
      <div className={cn("ecosystem-wrap", mode === "after" && "is-after", activeId && "is-detail-open")}>
        <div className="ecosystem-stage" role="list" aria-label="Процессы бизнеса до и после AEVIX">
          {processes.map((node, index) => {
            const angle = START_ANGLE + index * ANGLE_STEP;
            return (
              <span
                key={`spoke-${node.id}`}
                className="ecosystem-spoke"
                style={{ "--angle": `${angle}deg` } as CSSProperties}
                aria-hidden="true"
              />
            );
          })}

          <div className="ecosystem-core">
            <span>{mode === "before" ? "Сейчас" : "После AEVIX"}</span>
          </div>

          {processes.map((node, index) => {
            const angle = START_ANGLE + index * ANGLE_STEP;
            const Icon = node.icon;
            const label = mode === "before" ? node.title.before : node.title.after;
            return (
              <button
                key={node.id}
                type="button"
                role="listitem"
                className="ecosystem-node"
                style={{ "--angle": `${angle}deg`, "--i": index } as CSSProperties}
                onClick={() => onSelect(node.id)}
                aria-label={`Подробнее: ${label}`}
              >
                <span className="ecosystem-node-dot">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="ecosystem-node-label">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="ecosystem-result">
          <span>{mode === "before" ? "Разрозненный процесс" : "Единый рабочий контур"}</span>
          <strong>{mode === "before" ? "Команда держит систему в голове" : "AEVIX ведёт следующий шаг автоматически"}</strong>
          <p>
            {mode === "before"
              ? "Переключитесь на «После AEVIX», чтобы собрать процесс, или нажмите на узел сети — подробности справа."
              : "AI, CRM, запись и статусы работают как одна последовательность. Нажмите на узел, чтобы увидеть детали."}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {activeNode ? (
          <EcosystemCssDetail node={activeNode} mode={mode} onClose={() => onSelect(null)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function EcosystemCssDetail({
  node,
  mode,
  onClose,
}: {
  node: EcosystemProcessData;
  mode: EcosystemMode;
  onClose: () => void;
}) {
  const Icon = node.icon;
  const label = mode === "before" ? node.title.before : node.title.after;
  const text = mode === "before" ? node.description.before : node.description.after;
  const highlight = mode === "before" ? node.highlight?.before : node.highlight?.after;

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      className="ecosystem-detail"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={motionTransition.slow}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button type="button" className="ecosystem-detail-close" onClick={onClose} aria-label="Закрыть">
        <X className="h-4 w-4" />
      </button>
      <div className="ecosystem-detail-body">
        <motion.div
          initial={{ opacity: 0, scale: 0.55, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={motionTransition.slow}
          className={cn("ecosystem-detail-orb", mode === "after" && "is-after")}
        >
          <span className="ecosystem-node-dot">
            <Icon className="h-7 w-7" />
          </span>
          <span className="ecosystem-node-label">{label}</span>
        </motion.div>
        <motion.div
          className="ecosystem-detail-copy"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...motionTransition.slow, delay: 0.12 }}
        >
          <p className="ecosystem-detail-eyebrow">{mode === "before" ? "Что мешает" : "Что меняет AEVIX"}</p>
          <h3>{label}</h3>
          <p className="ecosystem-detail-text">{text}</p>
          {highlight ? <p className="ecosystem-detail-highlight">{highlight}</p> : null}
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  );
}
