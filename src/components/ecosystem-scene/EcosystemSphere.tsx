"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { createRadialGradientTexture } from "./utils";

/**
 * Volumetric-looking sphere built from cheap layers instead of a real transmissive material
 * (MeshPhysicalMaterial + transmission renders the scene to an offscreen target per object —
 * the single most expensive material feature in three.js, and this scene has a hard 60fps
 * budget with up to 6 of these on screen at once):
 *
 *   1. base shell   — MeshPhysicalMaterial, clearcoat, transmission: 0 (glassy, opaque-ish)
 *   2. inner glow   — smaller sphere, additive MeshBasicMaterial (the "pulsing inner light")
 *   3. rim light    — Fresnel ShaderMaterial, additive, one extra draw call, no render target
 *                     (skipped entirely on "low" quality — folded into the base emissive instead)
 *   4. halo sprite  — billboard with a runtime-generated radial-gradient CanvasTexture
 *   5. shadow sprite— same technique, dark gradient, offset below — a fake "volumetric shadow"
 *
 * All colour/intensity state is driven imperatively via the exposed handle (GSAP tweens these
 * directly in useEcosystemTimeline) rather than through React props, so animating never triggers
 * a re-render.
 */

const RIM_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const RIM_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.5);
    gl_FragColor = vec4(uColor, fresnel * uIntensity);
  }
`;

export type EcosystemSphereHandle = {
  group: THREE.Group;
  baseMaterial: THREE.MeshPhysicalMaterial;
  glowMaterial: THREE.MeshBasicMaterial;
  rimMaterial: THREE.ShaderMaterial | null;
  haloMaterial: THREE.SpriteMaterial;
  haloSprite: THREE.Sprite;
};

export type EcosystemSphereVariant = "core" | "satellite";

type EcosystemSphereProps = {
  variant: EcosystemSphereVariant;
  quality: "high" | "low";
};

export const EcosystemSphere = forwardRef<EcosystemSphereHandle, EcosystemSphereProps>(
  function EcosystemSphere({ variant, quality }, ref) {
    const groupRef = useRef<THREE.Group>(null!);
    const baseMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null!);
    const glowMaterialRef = useRef<THREE.MeshBasicMaterial>(null!);
    const rimMaterialRef = useRef<THREE.ShaderMaterial>(null!);
    const haloMaterialRef = useRef<THREE.SpriteMaterial>(null!);
    const haloSpriteRef = useRef<THREE.Sprite>(null!);

    const isCore = variant === "core";
    const high = quality === "high";
    const radius = isCore ? 1.15 : 0.62;
    const segments: [number, number] = high ? (isCore ? [40, 30] : [28, 20]) : [14, 10];

    const haloTexture = useMemo(
      () =>
        createRadialGradientTexture([
          [0, "rgba(255,255,255,0.55)"],
          [0.35, "rgba(255,255,255,0.18)"],
          [1, "rgba(255,255,255,0)"],
        ]),
      [],
    );
    const shadowTexture = useMemo(
      () =>
        createRadialGradientTexture([
          [0, "rgba(10,8,20,0.35)"],
          [0.6, "rgba(10,8,20,0.12)"],
          [1, "rgba(10,8,20,0)"],
        ]),
      [],
    );

    const rimUniforms = useMemo(
      () => ({
        uColor: { value: new THREE.Color(0xffffff) },
        uIntensity: { value: 0.5 },
      }),
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        group: groupRef.current,
        baseMaterial: baseMaterialRef.current,
        glowMaterial: glowMaterialRef.current,
        rimMaterial: high ? rimMaterialRef.current : null,
        haloMaterial: haloMaterialRef.current,
        haloSprite: haloSpriteRef.current,
      }),
      [high],
    );

    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[radius, segments[0], segments[1]]} />
          <meshPhysicalMaterial
            ref={baseMaterialRef}
            color={0xf3f2f5}
            roughness={0.25}
            metalness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.15}
            transmission={0}
            transparent
            opacity={0.92}
          />
        </mesh>
        <mesh scale={0.72}>
          <sphereGeometry args={[radius, Math.max(12, segments[0] - 8), Math.max(10, segments[1] - 8)]} />
          <meshBasicMaterial
            ref={glowMaterialRef}
            color={0xffffff}
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {high ? (
          <mesh scale={1.06}>
            <sphereGeometry args={[radius, segments[0], segments[1]]} />
            <shaderMaterial
              ref={rimMaterialRef}
              vertexShader={RIM_VERTEX}
              fragmentShader={RIM_FRAGMENT}
              uniforms={rimUniforms}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.FrontSide}
            />
          </mesh>
        ) : null}
        <sprite ref={haloSpriteRef} scale={[radius * 3.2, radius * 3.2, 1]}>
          <spriteMaterial
            ref={haloMaterialRef}
            map={haloTexture}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <sprite position={[0, -radius * 1.4, -0.2]} scale={[radius * 2.6, radius * 1.3, 1]}>
          <spriteMaterial map={shadowTexture} transparent opacity={0.6} depthWrite={false} />
        </sprite>
      </group>
    );
  },
);
