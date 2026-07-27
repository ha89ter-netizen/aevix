"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { EcosystemSphere, type EcosystemSphereHandle } from "./EcosystemSphere";
import { EcosystemConnections, type EcosystemConnectionHandle } from "./EcosystemConnections";
import { EcosystemDetailPanel } from "./EcosystemDetailPanel";
import { useEcosystemTimeline } from "./useEcosystemTimeline";
import type { EcosystemMode, EcosystemNodeData } from "./types";

const ORBIT_RADIUS = 3.1;
const FOCUS_SLOT = new THREE.Vector3(0, 0.15, 4.6);
const FOCUS_SCALE = 1.9;

type SatelliteState = {
  baseAngle: number;
  baseZ: number;
  bobFreq: number;
  bobPhase: number;
  spinPhase: number;
};

function useSatelliteLayout(count: number) {
  return useMemo<SatelliteState[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        baseAngle: (i / count) * Math.PI * 2 - Math.PI / 2,
        baseZ: (i % 2 === 0 ? 1 : -1) * (0.25 + (i % 3) * 0.08),
        bobFreq: 0.35 + i * 0.05,
        bobPhase: i * 1.9,
        spinPhase: i * 2.3,
      })),
    [count],
  );
}

/** Pure function of layout + elapsed time — the same formula used both by the per-frame idle
 * loop and by the "what position do I resume from on unfocus" lookup, so they can never disagree. */
function idlePosition(layout: SatelliteState, elapsed: number): THREE.Vector3 {
  const angle = layout.baseAngle;
  return new THREE.Vector3(
    Math.cos(angle) * ORBIT_RADIUS,
    Math.sin(elapsed * layout.bobFreq + layout.bobPhase) * 0.18,
    Math.sin(angle) * ORBIT_RADIUS * 0.55 + layout.baseZ,
  );
}

function SatelliteMesh({
  index,
  node,
  layout,
  quality,
  mode,
  isActive,
  isAnyActive,
  onSelect,
  registerNode,
  focusBlend,
}: {
  index: number;
  node: EcosystemNodeData;
  layout: SatelliteState;
  quality: "high" | "low";
  mode: EcosystemMode;
  isActive: boolean;
  isAnyActive: boolean;
  onSelect: (id: string | null) => void;
  registerNode: (index: number, handle: EcosystemSphereHandle | null) => void;
  focusBlend: { value: number };
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const sphereRef = useRef<EcosystemSphereHandle | null>(null);
  const [hovered, setHovered] = useState(false);

  useCursor(hovered);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    if (isActive) return; // GSAP fully owns position/scale while focused

    const t = clock.getElapsedTime();
    const target = idlePosition(layout, t);

    // Non-focused satellites dim/recede slightly while another node is focused.
    const recede = isAnyActive ? focusBlend.value * 0.8 : 0;
    group.position.set(target.x, target.y, target.z - recede);
    const dim = 1 - (isAnyActive ? focusBlend.value * 0.5 : 0);
    if (sphereRef.current) {
      sphereRef.current.baseMaterial.opacity = 0.92 * dim;
    }
    group.scale.setScalar(hovered && !isAnyActive ? 1.08 : 1);
    group.rotation.y = t * 0.15 + layout.spinPhase;
  });

  const label = mode === "before" ? node.before : node.after;

  return (
    <group ref={groupRef}>
      <EcosystemSphere
        ref={(handle) => {
          sphereRef.current = handle;
          registerNode(index, handle);
        }}
        variant="satellite"
        quality={quality}
      />
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(isActive ? null : node.id);
        }}
      >
        <sphereGeometry args={[0.95, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {isActive ? (
        <EcosystemDetailPanel
          icon={node.icon}
          eyebrow={mode === "before" ? "Что мешает" : "Что меняет AEVIX"}
          label={label}
          text={mode === "before" ? node.beforeText : node.afterText}
          onClose={() => onSelect(null)}
        />
      ) : null}
    </group>
  );
}

function CoreMesh({
  quality,
  registerCore,
  sharedAfterness,
}: {
  quality: "high" | "low";
  registerCore: (handle: EcosystemSphereHandle | null) => void;
  sharedAfterness: { value: number };
}) {
  const sphereRef = useRef<EcosystemSphereHandle | null>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breathe = 1 + Math.sin(t * (0.5 + sharedAfterness.value * 0.4)) * (0.04 + sharedAfterness.value * 0.05);
    sphereRef.current?.group.scale.setScalar(breathe);
  });
  return (
    <EcosystemSphere
      ref={(handle) => {
        sphereRef.current = handle;
        registerCore(handle);
      }}
      variant="core"
      quality={quality}
    />
  );
}

function SceneContents({
  nodes,
  mode,
  activeId,
  onSelect,
  quality,
}: {
  nodes: EcosystemNodeData[];
  mode: EcosystemMode;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  quality: "high" | "low";
}) {
  const timeline = useEcosystemTimeline();
  const layouts = useSatelliteLayout(nodes.length);
  const rootGroupRef = useRef<THREE.Group>(null!);
  const pointer = useThree((state) => state.pointer);
  const clockRef = useThree((state) => state.clock);

  const prevMode = useRef(mode);
  useEffect(() => {
    if (prevMode.current !== mode) {
      timeline.igniteTransform(mode === "after");
      prevMode.current = mode;
    }
  }, [mode, timeline]);

  const prevActive = useRef<string | null>(null);
  useEffect(() => {
    const index = nodes.findIndex((node) => node.id === activeId);
    const prevIndex = nodes.findIndex((node) => node.id === prevActive.current);

    if (activeId && index >= 0) {
      timeline.focusNode(index, () => idlePosition(layouts[index], clockRef.getElapsedTime()), FOCUS_SLOT, FOCUS_SCALE);
    } else if (prevIndex >= 0) {
      timeline.unfocusNode(prevIndex, () => idlePosition(layouts[prevIndex], clockRef.getElapsedTime()));
    }
    prevActive.current = activeId;
  }, [activeId, nodes, layouts, timeline, clockRef]);

  const onConnectionsReady = useCallback(
    (handles: EcosystemConnectionHandle[]) => {
      timeline.registerConnections(handles);
    },
    [timeline],
  );

  const getCore = useCallback(() => timeline.coreRef.current?.group ?? null, [timeline]);
  const getNode = useCallback((index: number) => timeline.nodeHandlesRef.current[index]?.group ?? null, [timeline]);

  useFrame((_, delta) => {
    const root = rootGroupRef.current;
    if (!root) return;
    // Gentle cursor parallax — a light tilt, never a full orbit takeover.
    const targetRotY = pointer.x * 0.12;
    const targetRotX = -pointer.y * 0.06;
    root.rotation.y += (targetRotY - root.rotation.y) * Math.min(1, delta * 2);
    root.rotation.x += (targetRotX - root.rotation.x) * Math.min(1, delta * 2);

    const beforeSpeed = 0.12;
    const afterSpeed = 0.45;
    for (const connection of timeline.connectionHandlesRef.current) {
      connection.afterness.value = timeline.shared.afterness.value;
      connection.pulseSpeed.value = beforeSpeed + (afterSpeed - beforeSpeed) * timeline.shared.afterness.value;
    }
  });

  return (
    <group ref={rootGroupRef}>
      <ambientLight intensity={0.65} />
      <pointLight position={[3, 4, 5]} intensity={22} color={0xffffff} />
      <pointLight position={[-4, -2, -3]} intensity={8} color={0x7657f7} />
      <Environment resolution={16}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 2]} scale={[4, 2, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[-3, -1, -2]} scale={2} color="#7657f7" />
      </Environment>

      <CoreMesh quality={quality} registerCore={timeline.registerCore} sharedAfterness={timeline.shared.afterness} />

      {nodes.map((node, index) => (
        <SatelliteMesh
          key={node.id}
          index={index}
          node={node}
          layout={layouts[index]}
          quality={quality}
          mode={mode}
          isActive={activeId === node.id}
          isAnyActive={activeId !== null}
          onSelect={onSelect}
          registerNode={timeline.registerNode}
          focusBlend={timeline.shared.focusBlend}
        />
      ))}

      <EcosystemConnections getCore={getCore} getNode={getNode} count={nodes.length} quality={quality} onReady={onConnectionsReady} />
    </group>
  );
}

export type EcosystemSceneProps = {
  nodes: EcosystemNodeData[];
  mode: EcosystemMode;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  quality: "high" | "low";
};

export default function EcosystemScene({ nodes, mode, activeId, onSelect, quality }: EcosystemSceneProps) {
  return (
    <Canvas
      className="ecosystem-canvas"
      dpr={quality === "high" ? [1, 1.75] : [1, 1]}
      camera={{ position: [0, 0.3, 8.5], fov: 42 }}
      gl={{ antialias: quality === "high", alpha: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <SceneContents nodes={nodes} mode={mode} activeId={activeId} onSelect={onSelect} quality={quality} />
    </Canvas>
  );
}
