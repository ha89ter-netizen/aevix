"use client";

import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import type { EcosystemSphereHandle } from "./EcosystemSphere";
import type { EcosystemConnectionHandle } from "./EcosystemConnections";
import { AFTER_CORE_COLOR, AFTER_NODE_COLOR, BEFORE_CORE_COLOR, BEFORE_NODE_COLOR } from "./utils";

/**
 * All GSAP orchestration for the scene lives here, scoped in a single gsap.context() reverted on
 * unmount — matching the exact pattern the site's own usePremiumMotion (page.tsx) already uses for
 * its ScrollTrigger animations. Continuous idle motion (orbit, bob, breathing) is NOT GSAP's job —
 * it's a pure function of clock.getElapsedTime() computed every frame in EcosystemScene's useFrame.
 * GSAP only drives discrete state transitions: the before/after "ignition", and a node
 * focusing/unfocusing.
 */

export type EcosystemSharedValues = {
  /** 0 (before) .. 1 (after) — smoothly tweened on toggle; drives colour/glow lerps every frame. */
  afterness: { value: number };
  /** Spikes during the ignition transition then decays to 0 — added to the base rotation speed. */
  rotationBoost: { value: number };
  /** 0 (nothing focused) .. 1 (a node is focused) — dims/recedes the non-focused nodes. */
  focusBlend: { value: number };
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

  const ctxRef = useRef<gsap.Context | null>(null);
  const coreRef = useRef<EcosystemSphereHandle | null>(null);
  const nodeHandlesRef = useRef<Array<EcosystemSphereHandle | null>>([]);
  const connectionHandlesRef = useRef<EcosystemConnectionHandle[]>([]);

  useEffect(() => {
    ctxRef.current = gsap.context(() => {});
    return () => ctxRef.current?.revert();
  }, []);

  const registerCore = (handle: EcosystemSphereHandle | null) => {
    coreRef.current = handle;
  };
  const registerNode = (index: number, handle: EcosystemSphereHandle | null) => {
    nodeHandlesRef.current[index] = handle;
  };
  const registerConnections = (handles: EcosystemConnectionHandle[]) => {
    connectionHandlesRef.current = handles;
  };

  /** The before/after "ignition": rotation spikes, colours lerp, then everything settles. */
  const igniteTransform = (toAfter: boolean) => {
    const tl = gsap.timeline();
    ctxRef.current?.add(() => tl);
    tl.to(shared.afterness, { value: toAfter ? 1 : 0, duration: 2, ease: "power2.inOut" }, 0);
    tl.to(shared.rotationBoost, { value: 1, duration: 0.55, ease: "power2.out" }, 0);
    tl.to(shared.rotationBoost, { value: 0, duration: 1.3, ease: "power2.inOut" }, 0.55);

    const core = coreRef.current;
    if (core) {
      const targetColor = toAfter ? AFTER_CORE_COLOR : BEFORE_CORE_COLOR;
      tl.to(core.baseMaterial.color, colorTo(targetColor), 0);
      tl.to(core.glowMaterial, { opacity: toAfter ? 0.55 : 0.2, duration: 1.6, ease: "power2.inOut" }, 0.1);
      tl.to(core.glowMaterial.color, colorTo(targetColor), 0.1);
      if (core.rimMaterial) {
        tl.to(core.rimMaterial.uniforms.uIntensity, { value: toAfter ? 1.3 : 0.4, duration: 1.6 }, 0.1);
        tl.to(core.rimMaterial.uniforms.uColor.value, colorTo(targetColor), 0.1);
      }
    }

    nodeHandlesRef.current.forEach((node, i) => {
      if (!node) return;
      const targetColor = toAfter ? AFTER_NODE_COLOR : BEFORE_NODE_COLOR;
      const delay = 0.05 * i;
      tl.to(node.baseMaterial.color, colorTo(targetColor), delay);
      tl.to(node.glowMaterial, { opacity: toAfter ? 0.4 : 0.18, duration: 1.4 }, delay);
      tl.to(node.glowMaterial.color, colorTo(targetColor), delay);
      if (node.rimMaterial) {
        tl.to(node.rimMaterial.uniforms.uIntensity, { value: toAfter ? 0.9 : 0.35, duration: 1.4 }, delay);
        tl.to(node.rimMaterial.uniforms.uColor.value, colorTo(targetColor), delay);
      }
    });

    return tl;
  };

  /** Tween a satellite toward/away from the fixed on-screen "focus slot". */
  const focusNode = (
    index: number,
    getIdlePosition: () => THREE.Vector3,
    focusSlot: THREE.Vector3,
    scaleTarget: number,
  ) => {
    const node = nodeHandlesRef.current[index];
    if (!node) return;
    gsap.killTweensOf(node.group.position);
    gsap.killTweensOf(node.group.scale);
    gsap.to(shared.focusBlend, { value: 1, duration: 0.5, ease: "power2.out" });
    gsap.to(node.group.position, { x: focusSlot.x, y: focusSlot.y, z: focusSlot.z, duration: 0.6, ease: "power3.out" });
    gsap.to(node.group.scale, { x: scaleTarget, y: scaleTarget, z: scaleTarget, duration: 0.6, ease: "power3.out" });
    void getIdlePosition; // idle position is only needed again on unfocus, kept for symmetry
  };

  const unfocusNode = (index: number, getIdlePosition: () => THREE.Vector3) => {
    const node = nodeHandlesRef.current[index];
    if (!node) return;
    const target = getIdlePosition();
    gsap.killTweensOf(node.group.position);
    gsap.killTweensOf(node.group.scale);
    gsap.to(shared.focusBlend, { value: 0, duration: 0.45, ease: "power2.inOut" });
    gsap.to(node.group.position, { x: target.x, y: target.y, z: target.z, duration: 0.5, ease: "power2.inOut" });
    gsap.to(node.group.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power2.inOut" });
  };

  return {
    shared,
    coreRef,
    nodeHandlesRef,
    connectionHandlesRef,
    registerCore,
    registerNode,
    registerConnections,
    igniteTransform,
    focusNode,
    unfocusNode,
  };
}

function colorTo(hex: number) {
  const color = new THREE.Color(hex);
  return { r: color.r, g: color.g, b: color.b, duration: 1.6, ease: "power2.inOut" as const };
}
