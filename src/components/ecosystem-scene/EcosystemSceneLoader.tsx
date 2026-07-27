"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { EcosystemCssFallback } from "./EcosystemCssFallback";
import type { EcosystemMode, EcosystemNodeData } from "./types";

/**
 * The only file page.tsx imports directly for this feature. Decides between three states:
 *
 *  1. prefers-reduced-motion: the CSS fallback, permanently — Canvas/WebGL is never created.
 *  2. Motion is fine but the section hasn't scrolled near the viewport yet: nothing 3D loads
 *     at all (not even the JS chunk) — the CSS fallback is shown here too, so there's no layout
 *     gap, and it doubles as next/dynamic's `loading` state once the chunk starts fetching.
 *  3. In view + motion allowed: the three.js/@react-three chunk (~250-350KB gzipped, entirely
 *     separate from the main bundle) is dynamically imported and mounted.
 *
 * This keeps the current `/` route's First Load JS completely unaffected — the heavy chunk only
 * ever downloads for a visitor who actually scrolls to this section, and never in a reduced-
 * motion session.
 */

const EcosystemScene = dynamic(() => import("./EcosystemScene"), {
  ssr: false,
});

export type EcosystemSceneLoaderProps = {
  nodes: EcosystemNodeData[];
  mode: EcosystemMode;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  quality: "high" | "low";
};

export function EcosystemSceneLoader({ nodes, mode, activeId, onSelect, quality }: EcosystemSceneLoaderProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  if (reducedMotion) {
    return <EcosystemCssFallback nodes={nodes} mode={mode} activeId={activeId} onSelect={onSelect} />;
  }

  const fallback = <EcosystemCssFallback nodes={nodes} mode={mode} activeId={activeId} onSelect={onSelect} />;

  return (
    <div ref={containerRef} className="ecosystem-canvas-wrap">
      {inView ? (
        <>
          {/* 3D meshes aren't part of the DOM focus order, so raycasted onClick alone gives
              keyboard/screen-reader users no way to open a node. This mirrors the CSS
              fallback's real, visible buttons but visually hidden — same onSelect, same source
              of truth, just reachable by Tab instead of a pointer. */}
          <EcosystemA11yControls nodes={nodes} mode={mode} activeId={activeId} onSelect={onSelect} />
          <Suspense fallback={fallback}>
            <EcosystemScene nodes={nodes} mode={mode} activeId={activeId} onSelect={onSelect} quality={quality} />
          </Suspense>
        </>
      ) : (
        fallback
      )}
    </div>
  );
}

function EcosystemA11yControls({ nodes, mode, activeId, onSelect }: Omit<EcosystemSceneLoaderProps, "quality">) {
  return (
    <div className="sr-only">
      {nodes.map((node) => {
        const label = mode === "before" ? node.before : node.after;
        const isActive = activeId === node.id;
        return (
          <button
            key={node.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? null : node.id)}
          >
            {`Подробнее: ${label}`}
          </button>
        );
      })}
    </div>
  );
}
