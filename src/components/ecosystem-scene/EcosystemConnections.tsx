"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2, LineGeometry, LineMaterial } from "three-stdlib";
import { createRadialGradientTexture } from "./utils";

/**
 * Curved "energy" connections from the core to each satellite, each carrying 1-2 travelling
 * light pulses. Recomputed every frame directly from the live sphere group positions (world
 * space) — one Bezier curve per connection is the single source of truth for both the line's
 * point list and the pulse's position along it, so "pulse follows the line, line follows the
 * spheres" stays trivially consistent.
 *
 * Uses three-stdlib's Line2/LineGeometry/LineMaterial directly (the same primitives
 * @react-three/drei's <Line> wraps) instead of that component, because drei's wrapper rebuilds
 * the whole geometry via useMemo whenever the `points` prop changes — fine for a static line, but
 * this one's points change every frame. Managing the geometry imperatively via refs means each
 * frame only calls `setPositions()` on an already-allocated buffer.
 */

export type EcosystemConnectionHandle = {
  material: LineMaterial;
  pulseMaterials: THREE.SpriteMaterial[];
  /** Pulses per second travelling along the curve — GSAP tweens this plain number directly. */
  pulseSpeed: { value: number };
  /** 0 (before) .. 1 (after) — GSAP tweens this to drive colour/width/opacity together. */
  afterness: { value: number };
};

type EcosystemConnectionsProps = {
  /** Getters rather than RefObjects: the underlying positions live inside per-node sphere
   * handles (owned by useEcosystemTimeline for GSAP's benefit), not standalone Object3D refs —
   * a getter is the simplest thing that works regardless of where the handle is actually stored. */
  getCore: () => THREE.Object3D | null;
  getNode: (index: number) => THREE.Object3D | null;
  count: number;
  quality: "high" | "low";
  onReady?: (handles: EcosystemConnectionHandle[]) => void;
};

const BEFORE_COLOR = new THREE.Color(0x9a9aa0);
const AFTER_COLOR = new THREE.Color(0x7657f7);

export function EcosystemConnections({ getCore, getNode, count, quality, onReady }: EcosystemConnectionsProps) {
  const size = useThree((state) => state.size);
  const pulsesPerConnection = quality === "high" ? 2 : 1;
  const segments = quality === "high" ? 24 : 14;

  const connections = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      );
      const geometry = new LineGeometry();
      const initialPositions = new Float32Array((segments + 1) * 3);
      geometry.setPositions(initialPositions);
      const material = new LineMaterial({
        color: BEFORE_COLOR.getHex(),
        linewidth: 1.6,
        transparent: true,
        opacity: 0.4,
        resolution: new THREE.Vector2(size.width, size.height),
      });
      const line = new Line2(geometry, material);

      const pulseTexture = createRadialGradientTexture([
        [0, "rgba(255,255,255,0.9)"],
        [0.4, "rgba(255,255,255,0.35)"],
        [1, "rgba(255,255,255,0)"],
      ]);
      const pulseMaterials = Array.from({ length: pulsesPerConnection }, () => {
        return new THREE.SpriteMaterial({
          map: pulseTexture,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
      });
      const pulseSprites = pulseMaterials.map((material) => new THREE.Sprite(material));

      return {
        index,
        curve,
        line,
        geometry,
        material,
        pulseSprites,
        pulseMaterials,
        pulseSpeed: { value: 0.18 + index * 0.02 },
        afterness: { value: 0 },
        // Each connection bends a slightly different, fixed way and drifts at its own slow,
        // phase-offset rate — smooth and "alive" rather than randomised/glitchy.
        bendSign: index % 2 === 0 ? 1 : -1,
        wobblePhase: index * 1.7,
      };
    });
  }, [count, pulsesPerConnection, segments, size.width, size.height]);

  useEffect(() => {
    onReady?.(
      connections.map((connection) => ({
        material: connection.material,
        pulseMaterials: connection.pulseMaterials,
        pulseSpeed: connection.pulseSpeed,
        afterness: connection.afterness,
      })),
    );
  }, [connections, onReady]);

  useEffect(() => {
    return () => {
      for (const connection of connections) {
        connection.geometry.dispose();
        connection.material.dispose();
        for (const material of connection.pulseMaterials) {
          material.map?.dispose();
          material.dispose();
        }
      }
    };
  }, [connections]);

  const startVec = useRef(new THREE.Vector3());
  const endVec = useRef(new THREE.Vector3());
  const midVec = useRef(new THREE.Vector3());
  const perpVec = useRef(new THREE.Vector3());
  const pointsScratch = useRef<Float32Array | null>(null);

  useFrame(({ clock }) => {
    const core = getCore();
    if (!core) return;
    const t = clock.getElapsedTime();
    core.getWorldPosition(startVec.current);

    for (const connection of connections) {
      const node = getNode(connection.index);
      if (!node) continue;
      node.getWorldPosition(endVec.current);

      const distance = startVec.current.distanceTo(endVec.current);
      midVec.current.copy(startVec.current).lerp(endVec.current, 0.5);
      perpVec.current
        .subVectors(endVec.current, startVec.current)
        .normalize()
        .cross(new THREE.Vector3(0, 1, 0))
        .normalize();
      const wobble = Math.sin(t * 0.3 + connection.wobblePhase) * distance * 0.03;
      const bend = distance * (0.14 + connection.afterness.value * 0.05) * connection.bendSign + wobble;
      midVec.current.addScaledVector(perpVec.current, bend);

      connection.curve.v0.copy(startVec.current);
      connection.curve.v1.copy(midVec.current);
      connection.curve.v2.copy(endVec.current);

      if (!pointsScratch.current || pointsScratch.current.length !== (segments + 1) * 3) {
        pointsScratch.current = new Float32Array((segments + 1) * 3);
      }
      const points = connection.curve.getPoints(segments);
      for (let i = 0; i < points.length; i++) {
        pointsScratch.current[i * 3] = points[i].x;
        pointsScratch.current[i * 3 + 1] = points[i].y;
        pointsScratch.current[i * 3 + 2] = points[i].z;
      }
      connection.geometry.setPositions(pointsScratch.current);
      connection.line.computeLineDistances();
      connection.material.resolution.set(size.width, size.height);
      connection.material.color.copy(BEFORE_COLOR).lerp(AFTER_COLOR, connection.afterness.value);
      connection.material.opacity = 0.35 + connection.afterness.value * 0.45;
      connection.material.linewidth = 1.4 + connection.afterness.value * 1.2;

      connection.pulseSprites.forEach((sprite, pulseIndex) => {
        const phase = pulseIndex / connection.pulseSprites.length;
        const speed = connection.pulseSpeed.value;
        const along = (t * speed + phase + connection.index * 0.13) % 1;
        const point = connection.curve.getPointAt(along);
        sprite.position.copy(point);
        const scale = 0.16 + connection.afterness.value * 0.08;
        sprite.scale.setScalar(scale);
        const material = connection.pulseMaterials[pulseIndex];
        material.opacity = 0.35 + connection.afterness.value * 0.5;
        material.color.set(connection.afterness.value > 0.5 ? AFTER_COLOR : 0xffffff);
      });
    }
  });

  return (
    <group>
      {connections.map((connection) => (
        <group key={connection.index}>
          <primitive object={connection.line} />
          {connection.pulseSprites.map((sprite, i) => (
            <primitive key={i} object={sprite} />
          ))}
        </group>
      ))}
    </group>
  );
}
