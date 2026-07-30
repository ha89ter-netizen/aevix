"use client";

import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import type { EcosystemSphereHandle } from "./EcosystemSphere";
import type { EcosystemConnectionHandle } from "./EcosystemConnections";
import type { Vec3 } from "./types";
import { AFTER_CORE_COLOR, AFTER_NODE_COLOR, BEFORE_CORE_COLOR, BEFORE_NODE_COLOR } from "./utils";
import { easeGsap } from "@/lib/motion";

/**
 * All GSAP orchestration for the scene lives here, scoped in a single gsap.context() reverted on
 * unmount — the same pattern the site's own usePremiumMotion (page.tsx) uses for its ScrollTrigger
 * animations. Two kinds of motion are handled, both discrete state transitions, never continuous
 * per-frame drift:
 *
 *  - igniteTransform: the before/after toggle. Reorganises each node's fixed *slot* position from
 *    its "before" constant to its "after" constant (or back), lerps every material's colour, and
 *    ignites the core — all in one ~1.8-2.5s timeline.
 *  - moveCamera: the camera-driven focus transition (800-1200ms) used both when a node is
 *    selected/deselected and when navigating directly between nodes. The scene's objects never
 *    move to the camera — only the camera moves, by tweening two plain vector-like objects that
 *    the scene reads every frame via camera.position.set(...) / camera.lookAt(...).
 *
 * Continuous idle micro-motion (the "slight sway", a few pixels of amplitude) is intentionally
 * NOT handled here — it's applied directly in EcosystemScene's per-frame loop to a small inner
 * "jitter" group nested inside each node's stable slot group, so it can never fight these tweens.
 */

export type EcosystemSharedValues = {
  /** 0 (before) .. 1 (after) — smoothly tweened on toggle; drives colour/glow lerps every frame. */
  afterness: { value: number };
  /** Spikes during the ignition transition then decays to 0 — added to the base rotation speed. */
  rotationBoost: { value: number };
  /** 0 (nothing focused) .. 1 (a node is focused) — dims/recedes the non-focused nodes. */
  focusBlend: { value: number };
};

export type CameraState = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
};

export function useEcosystemTimeline() {
  const shared = useMemo<EcosystemSharedValues>(
    () => ({
      afterness: { value: 0 },
      rotationBoost: { value: 0 },
      focusBlend: { value: 0 },
    }),
    [],
  );

  const camera = useMemo<CameraState>(
    () => ({
      position: { x: 0, y: 0.5, z: 8.2 },
      target: { x: 0, y: 0, z: 0 },
    }),
    [],
  );

  const ctxRef = useRef<gsap.Context | null>(null);
  const coreRef = useRef<EcosystemSphereHandle | null>(null);
  const sphereHandlesRef = useRef<Array<EcosystemSphereHandle | null>>([]);
  const slotGroupsRef = useRef<Array<THREE.Group | null>>([]);
  const connectionHandlesRef = useRef<EcosystemConnectionHandle[]>([]);

  useEffect(() => {
    ctxRef.current = gsap.context(() => {});
    return () => ctxRef.current?.revert();
  }, []);

  const registerCore = (handle: EcosystemSphereHandle | null) => {
    coreRef.current = handle;
  };
  const registerSphere = (index: number, handle: EcosystemSphereHandle | null) => {
    sphereHandlesRef.current[index] = handle;
  };
  const registerSlot = (index: number, group: THREE.Group | null) => {
    slotGroupsRef.current[index] = group;
  };
  const registerConnections = (handles: EcosystemConnectionHandle[]) => {
    connectionHandlesRef.current = handles;
  };

  /** Eases the camera's position/lookAt-target to a destination — no spring, ever. Used both for
   * focus/unfocus (800-1200ms) and for the brief pull-back inside the ignition timeline. */
  const moveCamera = (
    position: Vec3,
    target: Vec3,
    duration: number,
    ease: string = easeGsap.inOut,
    timeline?: gsap.core.Timeline,
    at?: number | string,
  ) => {
    const tweenTarget = timeline ?? gsap;
    const posTween = tweenTarget.to(camera.position, { x: position[0], y: position[1], z: position[2], duration, ease }, at);
    const lookTween = tweenTarget.to(camera.target, { x: target[0], y: target[1], z: target[2], duration, ease }, at);
    if (!timeline) {
      ctxRef.current?.add(() => posTween);
      ctxRef.current?.add(() => lookTween);
    }
  };

  /** The before/after "ignition": camera pulls back, colours lerp, node slots reorganise onto
   * their new fixed positions, the core ignites, then the camera returns to whatever was focused
   * (or the overview). Total duration lands in the spec's 1.8-2.5s window. */
  const igniteTransform = (
    toAfter: boolean,
    slotPositions: Array<{ before: Vec3; after: Vec3 }>,
    overview: { position: Vec3; target: Vec3 },
    focusReturn: { position: Vec3; target: Vec3 } | null,
  ) => {
    const tl = gsap.timeline();
    ctxRef.current?.add(() => tl);

    // 1. Camera pulls back to see the whole system.
    moveCamera(overview.position, overview.target, 0.55, easeGsap.soft, tl, 0);

    // 2. A short, controlled speed-up then settle (rotationBoost only nudges idle rotation speed
    //    in EcosystemScene's per-frame loop — it never teleports anything).
    tl.to(shared.rotationBoost, { value: 1, duration: 0.6, ease: easeGsap.soft }, 0.1);
    tl.to(shared.rotationBoost, { value: 0, duration: 1.4, ease: easeGsap.inOut }, 0.7);

    // 3. Connections + node colours lerp across the whole transform.
    tl.to(shared.afterness, { value: toAfter ? 1 : 0, duration: 2, ease: easeGsap.inOut }, 0.15);

    // 4. Node slots reorganise onto their new fixed composition.
    slotGroupsRef.current.forEach((group, i) => {
      if (!group) return;
      const dest = toAfter ? slotPositions[i]?.after : slotPositions[i]?.before;
      if (!dest) return;
      tl.to(group.position, { x: dest[0], y: dest[1], z: dest[2], duration: 1.6, ease: easeGsap.inOut }, 0.2);
    });

    // 5. Core ignites: colour + glow + rim intensity.
    const core = coreRef.current;
    if (core) {
      const targetColor = toAfter ? AFTER_CORE_COLOR : BEFORE_CORE_COLOR;
      tl.to(core.baseMaterial.color, colorTo(targetColor), 0.3);
      tl.to(core.glowMaterial, { opacity: toAfter ? 0.6 : 0.2, duration: 1.5, ease: easeGsap.inOut }, 0.4);
      tl.to(core.glowMaterial.color, colorTo(targetColor), 0.4);
      if (core.rimMaterial) {
        tl.to(core.rimMaterial.uniforms.uIntensity, { value: toAfter ? 1.35 : 0.4, duration: 1.5 }, 0.4);
        tl.to(core.rimMaterial.uniforms.uColor.value, colorTo(targetColor), 0.4);
      }
    }

    // 6. Satellite colours settle alongside the core.
    sphereHandlesRef.current.forEach((node, i) => {
      if (!node) return;
      const targetColor = toAfter ? AFTER_NODE_COLOR : BEFORE_NODE_COLOR;
      const delay = 0.35 + 0.04 * i;
      tl.to(node.baseMaterial.color, colorTo(targetColor), delay);
      tl.to(node.glowMaterial, { opacity: toAfter ? 0.42 : 0.18, duration: 1.3 }, delay);
      tl.to(node.glowMaterial.color, colorTo(targetColor), delay);
      if (node.rimMaterial) {
        tl.to(node.rimMaterial.uniforms.uIntensity, { value: toAfter ? 0.9 : 0.35, duration: 1.3 }, delay);
        tl.to(node.rimMaterial.uniforms.uColor.value, colorTo(targetColor), delay);
      }
    });

    // 7. Camera returns to the previously-focused node (now in its new state) or the overview.
    const returnDest = focusReturn ?? overview;
    moveCamera(returnDest.position, returnDest.target, 0.7, "power2.inOut", tl, 1.85);

    return tl;
  };

  return {
    shared,
    camera,
    coreRef,
    sphereHandlesRef,
    slotGroupsRef,
    connectionHandlesRef,
    registerCore,
    registerSphere,
    registerSlot,
    registerConnections,
    moveCamera,
    igniteTransform,
  };
}

function colorTo(hex: number) {
  const color = new THREE.Color(hex);
  return { r: color.r, g: color.g, b: color.b, duration: 1.5, ease: easeGsap.inOut };
}
