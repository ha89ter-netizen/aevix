"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { EcosystemCssFallback } from "./EcosystemCssFallback";
import type { EcosystemDevice } from "./EcosystemScene";
import type { EcosystemMode, EcosystemProcessData } from "./types";

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
  processes: EcosystemProcessData[];
  mode: EcosystemMode;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  quality: "high" | "low";
  device: EcosystemDevice;
};

export function EcosystemSceneLoader({ processes, mode, activeId, onSelect, quality, device }: EcosystemSceneLoaderProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  // Sticky — once the chunk has loaded it stays mounted (no repeated download/dispose churn on
  // every scroll in/out). isVisible instead toggles live and only pauses the render loop.
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        setIsVisible(visible);
        if (visible) setHasEnteredView(true);
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  if (reducedMotion) {
    return <EcosystemCssFallback processes={processes} mode={mode} activeId={activeId} onSelect={onSelect} />;
  }

  const fallback = <EcosystemCssFallback processes={processes} mode={mode} activeId={activeId} onSelect={onSelect} />;

  return (
    <div ref={containerRef} className="ecosystem-canvas-wrap">
      {hasEnteredView ? (
        <>
          {/* 3D meshes aren't part of the DOM focus order, so raycasted onClick alone gives
              keyboard/screen-reader users no way to open a node. This mirrors the CSS
              fallback's real, visible buttons but visually hidden — same onSelect, same source
              of truth, just reachable by Tab instead of a pointer. */}
          <EcosystemA11yControls processes={processes} mode={mode} activeId={activeId} onSelect={onSelect} />
          <Suspense fallback={fallback}>
            <EcosystemScene
              processes={processes}
              mode={mode}
              activeId={activeId}
              onSelect={onSelect}
              quality={quality}
              device={device}
              paused={!isVisible}
            />
          </Suspense>
        </>
      ) : (
        fallback
      )}
    </div>
  );
}

function EcosystemA11yControls({
  processes,
  mode,
  activeId,
  onSelect,
}: Omit<EcosystemSceneLoaderProps, "quality" | "device">) {
  return (
    <div className="sr-only">
      {processes.map((node) => {
        const label = mode === "before" ? node.title.before : node.title.after;
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
