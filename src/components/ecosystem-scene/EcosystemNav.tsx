"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * All the redundant navigation paths the spec requires beyond direct object/label clicks: arrow
 * buttons, a circular "puck" dial (drag-to-rotate, snaps to each fixed process), and a hook that
 * wires up keyboard arrows, touch swipe, and a Lenis-safe horizontal trackpad gesture — all
 * driving the same shared activeIndex, never their own competing state.
 */

export function EcosystemArrows({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="ecosystem-arrows" aria-hidden="false">
      <button type="button" className="ecosystem-arrow" onClick={onPrev} aria-label="Предыдущий процесс">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" className="ecosystem-arrow" onClick={onNext} aria-label="Следующий процесс">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

const STEP_DEG = 360;

export function EcosystemDial({
  count,
  activeIndex,
  currentLabel,
  onSelectIndex,
}: {
  count: number;
  activeIndex: number;
  currentLabel: string;
  onSelectIndex: (index: number) => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const stepDeg = STEP_DEG / count;
  const [rotation, setRotation] = useState(() => -activeIndex * stepDeg);
  const dragState = useRef<{ startAngle: number; startRotation: number } | null>(null);

  useEffect(() => {
    if (dragState.current) return;
    setRotation(-activeIndex * stepDeg);
  }, [activeIndex, stepDeg]);

  const angleFromCenter = useCallback((clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { startAngle: angleFromCenter(event.clientX, event.clientY), startRotation: rotation };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const angle = angleFromCenter(event.clientX, event.clientY);
    const delta = angle - dragState.current.startAngle;
    setRotation(dragState.current.startRotation + delta);
  };

  const finishDrag = () => {
    if (!dragState.current) return;
    dragState.current = null;
    setRotation((current) => {
      const steps = Math.round(-current / stepDeg);
      const nextIndex = ((steps % count) + count) % count;
      onSelectIndex(nextIndex);
      return -nextIndex * stepDeg;
    });
  };

  return (
    <div className="ecosystem-dial-group">
      <div
        ref={dialRef}
        className="ecosystem-dial"
        role="slider"
        aria-label="Навигация по процессам"
        aria-valuenow={activeIndex + 1}
        aria-valuemin={1}
        aria-valuemax={count}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") onSelectIndex((activeIndex + 1) % count);
          if (event.key === "ArrowLeft") onSelectIndex((activeIndex - 1 + count) % count);
        }}
      >
        <div className="ecosystem-dial-face" style={{ transform: `rotate(${rotation}deg)` }}>
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className="ecosystem-dial-tick"
              data-active={i === activeIndex}
              style={{ transform: `rotate(${i * stepDeg}deg) translateY(-50%)` }}
            />
          ))}
        </div>
        <div className="ecosystem-dial-hub" />
      </div>
      <div className="ecosystem-dial-readout">
        <span className="ecosystem-dial-index">
          {String(activeIndex + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
        <span className="ecosystem-dial-label">{currentLabel}</span>
      </div>
    </div>
  );
}

/** Keyboard arrows, touch swipe, and a Lenis-safe horizontal trackpad gesture, all calling the
 * same onNavigate(direction). Bound to containerRef so it only intercepts input over the scene,
 * never fighting the page's own vertical smooth-scroll elsewhere. */
export function useEcosystemGestureNav(
  containerRef: React.RefObject<HTMLElement | null>,
  onNavigate: (direction: 1 | -1) => void,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") onNavigate(1);
      if (event.key === "ArrowLeft") onNavigate(-1);
    };

    let touchStartX: number | null = null;
    let touchStartY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchStartX = event.touches[0]?.clientX ?? null;
      touchStartY = event.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartX === null || touchStartY === null) return;
      const endX = event.changedTouches[0]?.clientX ?? touchStartX;
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const dx = endX - touchStartX;
      const dy = endY - touchStartY;
      touchStartX = null;
      touchStartY = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      onNavigate(dx < 0 ? 1 : -1);
    };

    // Horizontal trackpad gesture: only intercept when the gesture is clearly more horizontal
    // than vertical, and only preventDefault in that branch — a normal vertical wheel/Lenis
    // scroll over this section is left completely alone.
    let wheelCooldown = false;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 24) return;
      event.preventDefault();
      if (wheelCooldown) return;
      wheelCooldown = true;
      onNavigate(event.deltaX > 0 ? 1 : -1);
      window.setTimeout(() => {
        wheelCooldown = false;
      }, 450);
    };

    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [containerRef, onNavigate]);
}
