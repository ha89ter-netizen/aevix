"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useCursor } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { EcosystemSphere, type EcosystemSphereHandle } from "./EcosystemSphere";
import { EcosystemConnections, type EcosystemConnectionHandle } from "./EcosystemConnections";
import { EcosystemDetailPanel } from "./EcosystemDetailPanel";
import { EcosystemLabel } from "./EcosystemLabel";
import { useEcosystemTimeline } from "./useEcosystemTimeline";
import { ecosystemComposition, ecosystemPosition, ecosystemPositions, type EcosystemDevice } from "./composition";
import type { EcosystemMode, EcosystemProcessData, Vec3 } from "./types";
import { duration as motionDuration, easeGsap } from "@/lib/motion";

export type { EcosystemDevice };

/** The radii EcosystemSphere actually builds its geometry at. Composition scales are expressed in
 * world units, so they are divided by these to become group scale factors. */
const DESIGN_CORE_RADIUS = 1.15;
const DESIGN_SATELLITE_RADIUS = 0.62;

/** Deterministic, hand-tuned function of a node's own fixed position — never randomness, never
 * elapsed time. The camera settles a composition-defined distance in front of the node, pulled
 * slightly toward the centre so the ring stays in frame instead of swinging fully off-screen. */
function focusCameraFor(device: EcosystemDevice, position: Vec3): { position: Vec3; target: Vec3 } {
  const [x, y, z] = position;
  const { focusDistance } = ecosystemComposition(device);
  if (device === "mobile") {
    return { position: [x * 0.5, y * 0.5, z + focusDistance], target: [x, y, z] };
  }
  return { position: [x * 0.4, y * 0.4 + 0.25, z + focusDistance], target: [x, y, z] };
}

function positionFor(index: number, device: EcosystemDevice, mode: EcosystemMode): Vec3 {
  return ecosystemPosition(index, device, mode);
}

/** Tiny, deterministic per-node sway — a few percent of a unit, applied to an inner "jitter"
 * group nested inside the node's stable slot group. The slot itself (label, hit-area, detail
 * panel, connection anchor) never jitters — only the cosmetic glass sphere does. */
function applyJitter(group: THREE.Group, elapsed: number, index: number) {
  const px = index * 1.7;
  const py = index * 2.3 + 1.1;
  const pz = index * 0.9 + 0.5;
  group.position.set(
    Math.sin(elapsed * 0.22 + px) * 0.045,
    Math.sin(elapsed * 0.17 + py) * 0.05,
    Math.cos(elapsed * 0.19 + pz) * 0.035,
  );
  group.rotation.y = Math.sin(elapsed * 0.1 + px) * 0.12;
}

function SatelliteMesh({
  index,
  node,
  device,
  mode,
  quality,
  isActive,
  isAnyActive,
  onSelect,
  registerSlot,
  registerSphere,
  focusBlend,
}: {
  index: number;
  node: EcosystemProcessData;
  device: EcosystemDevice;
  mode: EcosystemMode;
  quality: "high" | "low";
  isActive: boolean;
  isAnyActive: boolean;
  onSelect: (id: string | null) => void;
  registerSlot: (index: number, group: THREE.Group | null) => void;
  registerSphere: (index: number, handle: EcosystemSphereHandle | null) => void;
  focusBlend: { value: number };
}) {
  const slotRef = useRef<THREE.Group>(null!);
  const jitterRef = useRef<THREE.Group>(null!);
  const sphereRef = useRef<EcosystemSphereHandle | null>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const initialPosition = useMemo(() => positionFor(index, device, mode), [index, device, mode]);
  const { satelliteScale } = ecosystemComposition(device);
  // The hit area tracks the visible sphere so it stays comfortably larger than it on every
  // device, rather than staying desktop-sized while the sphere shrinks on a phone.
  const hitRadius = satelliteScale * 1.85;

  useFrame(({ clock }) => {
    if (jitterRef.current) applyJitter(jitterRef.current, clock.getElapsedTime(), index);
    const dim = 1 - (isAnyActive && !isActive ? focusBlend.value * 0.5 : 0);
    if (sphereRef.current) sphereRef.current.baseMaterial.opacity = 0.92 * dim;
  });

  const label = mode === "before" ? node.title.before : node.title.after;
  const caption = mode === "before" ? node.caption.before : node.caption.after;
  const description = mode === "before" ? node.description.before : node.description.after;
  const highlight = mode === "before" ? node.highlight?.before : node.highlight?.after;

  return (
    <group
      ref={(group) => {
        slotRef.current = group as THREE.Group;
        registerSlot(index, group);
      }}
      position={initialPosition}
    >
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
        {/* Hit-area deliberately larger than the visible sphere and anchored to the stable slot
            (never the jittering inner group) — always easy to hit, never a moving target. */}
        <sphereGeometry args={[hitRadius, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <EcosystemLabel title={label} caption={caption} dimmed={isAnyActive && !isActive} onClick={() => onSelect(isActive ? null : node.id)} />

      <group ref={jitterRef} scale={satelliteScale / DESIGN_SATELLITE_RADIUS}>
        <EcosystemSphere
          ref={(handle) => {
            sphereRef.current = handle;
            registerSphere(index, handle);
          }}
          variant="satellite"
          quality={quality}
        />
      </group>

      {isActive ? (
        <EcosystemDetailPanel
          icon={node.icon}
          eyebrow={mode === "before" ? "Что мешает" : "Что меняет AEVIX"}
          label={label}
          text={description}
          highlight={highlight}
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
  scale,
}: {
  quality: "high" | "low";
  registerCore: (handle: EcosystemSphereHandle | null) => void;
  sharedAfterness: { value: number };
  scale: number;
}) {
  const sphereRef = useRef<EcosystemSphereHandle | null>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breathe = 1 + Math.sin(t * (0.5 + sharedAfterness.value * 0.4)) * (0.04 + sharedAfterness.value * 0.05);
    // Breathing multiplies the composition's own scale instead of replacing it, so the core keeps
    // its device-correct dominance while it pulses.
    sphereRef.current?.group.scale.setScalar(breathe * scale);
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

/** Reads the GSAP-tweened camera.position/target every frame — this is the only thing that ever
 * moves toward a selected node. Nothing in the scene ever flies at the viewer. */
function CameraRig({ cameraState }: { cameraState: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } } }) {
  useFrame(({ camera }) => {
    camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
    camera.lookAt(cameraState.target.x, cameraState.target.y, cameraState.target.z);
  });
  return null;
}

function SceneContents({
  processes,
  mode,
  activeId,
  onSelect,
  quality,
  device,
}: {
  processes: EcosystemProcessData[];
  mode: EcosystemMode;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  quality: "high" | "low";
  device: EcosystemDevice;
}) {
  const timeline = useEcosystemTimeline();
  const rootGroupRef = useRef<THREE.Group>(null!);
  const pointer = useThree((state) => state.pointer);

  const composition = ecosystemComposition(device);
  const overview = composition.camera;

  // Camera never starts anywhere but the overview — the first focus (if any) still eases in.
  useEffect(() => {
    timeline.camera.position.x = overview.position[0];
    timeline.camera.position.y = overview.position[1];
    timeline.camera.position.z = overview.position[2];
    timeline.camera.target.x = overview.target[0];
    timeline.camera.target.y = overview.target[1];
    timeline.camera.target.z = overview.target[2];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  const prevMode = useRef(mode);
  useEffect(() => {
    if (prevMode.current !== mode) {
      const focusIndex = processes.findIndex((node) => node.id === activeId);
      const focusReturn = focusIndex >= 0 ? focusCameraFor(device, positionFor(focusIndex, device, mode)) : null;
      timeline.igniteTransform(
        mode === "after",
        processes.map((_, index) => ({
          before: ecosystemPositions(processes.length, device, "before")[index],
          after: ecosystemPositions(processes.length, device, "after")[index],
        })),
        overview,
        focusReturn,
      );
      prevMode.current = mode;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const prevActive = useRef<string | null>(null);
  useEffect(() => {
    if (prevActive.current === activeId) return;
    prevActive.current = activeId;
    const index = processes.findIndex((node) => node.id === activeId);
    const duration = 1; // within the spec's 800-1200ms window
    if (index >= 0) {
      const dest = focusCameraFor(device, positionFor(index, device, mode));
      timeline.moveCamera(dest.position, dest.target, duration);
      gsap.to(timeline.shared.focusBlend, { value: 1, duration: motionDuration.slower, ease: easeGsap.soft });
    } else {
      timeline.moveCamera(overview.position, overview.target, duration);
      gsap.to(timeline.shared.focusBlend, { value: 0, duration: motionDuration.slower, ease: easeGsap.soft });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const getCore = () => timeline.coreRef.current?.group ?? null;
  const getNode = (index: number) => timeline.slotGroupsRef.current[index] ?? null;

  useFrame((_, delta) => {
    const root = rootGroupRef.current;
    if (!root) return;
    const targetRotY = pointer.x * 0.1;
    const targetRotX = -pointer.y * 0.05;
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
    <>
      <CameraRig cameraState={timeline.camera} />
      <group ref={rootGroupRef}>
        <ambientLight intensity={0.65} />
        <pointLight position={[3, 4, 5]} intensity={22} color={0xffffff} />
        <pointLight position={[-4, -2, -3]} intensity={8} color={0x7657f7} />
        <Environment resolution={16}>
          <Lightformer form="rect" intensity={2} position={[0, 3, 2]} scale={[4, 2, 1]} />
          <Lightformer form="ring" intensity={1.2} position={[-3, -1, -2]} scale={2} color="#7657f7" />
        </Environment>

        <CoreMesh
          quality={quality}
          registerCore={timeline.registerCore}
          sharedAfterness={timeline.shared.afterness}
          scale={composition.coreScale / DESIGN_CORE_RADIUS}
        />

        {processes.map((node, index) => (
          <SatelliteMesh
            key={node.id}
            index={index}
            node={node}
            device={device}
            mode={mode}
            quality={quality}
            isActive={activeId === node.id}
            isAnyActive={activeId !== null}
            onSelect={onSelect}
            registerSlot={timeline.registerSlot}
            registerSphere={timeline.registerSphere}
            focusBlend={timeline.shared.focusBlend}
          />
        ))}

        <EcosystemConnections getCore={getCore} getNode={getNode} count={processes.length} quality={quality} onReady={timeline.registerConnections} />
      </group>
    </>
  );
}

export type EcosystemSceneProps = {
  processes: EcosystemProcessData[];
  mode: EcosystemMode;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  quality: "high" | "low";
  device: EcosystemDevice;
  /** True while the section has scrolled out of the viewport — stops the render loop entirely
   * (frameloop="never") instead of burning cycles on an off-screen scene. */
  paused?: boolean;
};

export default function EcosystemScene({ processes, mode, activeId, onSelect, quality, device, paused = false }: EcosystemSceneProps) {
  return (
    <Canvas
      className="ecosystem-canvas"
      dpr={quality === "high" ? [1, 1.75] : [1, 1]}
      camera={{ position: [...ecosystemComposition(device).camera.position], fov: 42 }}
      gl={{ antialias: quality === "high", alpha: true }}
      frameloop={paused ? "never" : "always"}
      onPointerMissed={() => onSelect(null)}
    >
      <SceneContents key={device} processes={processes} mode={mode} activeId={activeId} onSelect={onSelect} quality={quality} device={device} />
    </Canvas>
  );
}
