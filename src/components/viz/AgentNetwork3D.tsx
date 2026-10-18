import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Agent } from "@/data/types";
import { useReducedMotion } from "motion/react";

// Monochrome by default: an agent in character is bone white. Color only appears when something is wrong.
const STATUS_COLOR: Record<Agent["status"], string> = {
  protected: "#EDEBE6",
  learning: "#7FB2E5",
  held: "#F2B84B",
  restricted: "#F2B84B",
  quarantined: "#F06472",
};

function layout(agents: Agent[]) {
  const pos: Record<string, THREE.Vector3> = {};
  const hub = agents.find((a) => a.id === "agt-orch-00");
  const ring = agents.filter((a) => a !== hub);
  if (hub) pos[hub.id] = new THREE.Vector3(0, 0, 0);
  const inner = ring.filter((a) => !a.isCanary);
  inner.forEach((a, i) => {
    const t = (i / inner.length) * Math.PI * 2 + 0.3;
    pos[a.id] = new THREE.Vector3(Math.cos(t) * 3.2, Math.sin(i * 2.1) * 0.25, Math.sin(t) * 3.2);
  });
  ring.filter((a) => a.isCanary).forEach((a, i) => {
    const t = -0.9 + i;
    pos[a.id] = new THREE.Vector3(Math.cos(t) * 5, 0.1, Math.sin(t) * 5);
  });
  return pos;
}

function Packet({ from, to, color, speed, offset }: { from: THREE.Vector3; to: THREE.Vector3; color: string; speed: number; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mid = useMemo(() => from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0)), [from, to]);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(from, mid, to), [from, mid, to]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed + offset) % 1;
    ref.current.position.copy(curve.getPoint(t));
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function AgentNode({
  agent,
  position,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  agent: Agent;
  position: THREE.Vector3;
  selected: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const core = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Group>(null);
  const color = agent.isCanary ? "#8B7CFF" : STATUS_COLOR[agent.status];
  const hub = agent.id === "agt-orch-00";
  const size = hub ? 0.2 : 0.13;
  const ringR = hub ? 0.46 : 0.34;
  const broken = agent.status === "quarantined" || agent.status === "restricted" || agent.status === "held";
  // The role ring opens up as the agent drifts out of character, echoing the sigil
  const gap = broken ? Math.min(Math.PI * 1.1, (agent.risk / 100) * Math.PI * 1.4) : agent.isCanary ? Math.PI * 0.5 : 0.35;
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * (broken ? 0.9 : 0.15);
    if (core.current) {
      const target = hovered || selected ? 1.35 : 1;
      core.current.scale.lerp(new THREE.Vector3(target, target, target), 0.15);
    }
  });
  return (
    <group position={position}>
      <Billboard>
        <group ref={ring}>
          <mesh>
            <ringGeometry args={[ringR, ringR + (selected ? 0.03 : 0.018), 64, 1, gap / 2, Math.PI * 2 - gap]} />
            <meshBasicMaterial color={color} transparent opacity={selected || hovered ? 1 : broken ? 0.9 : 0.45} side={THREE.DoubleSide} />
          </mesh>
          {broken && (
            <mesh position={[Math.cos(0) * (ringR + 0.16), Math.sin(0) * (ringR + 0.16), 0]}>
              <circleGeometry args={[0.05, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          )}
        </group>
        {broken && (
          <mesh>
            <circleGeometry args={[ringR + 0.25, 48]} />
            <meshBasicMaterial color={color} transparent opacity={0.06} depthWrite={false} />
          </mesh>
        )}
      </Billboard>
      <mesh
        ref={core}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(agent.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(agent.id);
        }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* generous invisible hit target */}
      <mesh visible={false} onClick={(e) => { e.stopPropagation(); onSelect(agent.id); }} onPointerOver={(e) => { e.stopPropagation(); onHover(agent.id); }} onPointerOut={() => onHover(null)}>
        <sphereGeometry args={[ringR + 0.1, 8, 8]} />
      </mesh>
      <TextLabel
        text={agent.name}
        sub={hovered || selected ? (agent.isCanary ? "decoy" : `risk ${agent.risk}`) : undefined}
        subColor={color}
        active={hovered || selected}
        position={[0, -ringR - 0.26, 0]}
      />
    </group>
  );
}

function Orbit({ radius }: { radius: number }) {
  const pts = useMemo(() => Array.from({ length: 129 }, (_, i) => {
    const t = (i / 128) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius);
  }), [radius]);
  return <Line points={pts} color="#2D343D" lineWidth={1} transparent opacity={0.8} dashed dashSize={0.06} gapSize={0.12} />;
}

/** Text rendered to a canvas texture: avoids DOM portals inside the WebGL tree. */
function TextLabel({ text, sub, subColor, active, position }: { text: string; sub?: string; subColor: string; active: boolean; position: [number, number, number] }) {
  const { texture, aspect } = useMemo(() => {
    const scale = 3;
    const font = `500 ${12 * scale}px "Geist Variable", system-ui, sans-serif`;
    const mono = `${11 * scale}px "Geist Mono Variable", monospace`;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    ctx.font = font;
    const w1 = ctx.measureText(text).width;
    ctx.font = mono;
    const w2 = sub ? ctx.measureText(sub).width + 8 * scale : 0;
    const padX = 7 * scale;
    c.width = Math.ceil(w1 + w2 + padX * 2);
    c.height = 22 * scale;
    if (active) {
      ctx.fillStyle = "rgba(20,23,28,0.94)";
      ctx.strokeStyle = "rgba(45,52,61,1)";
      ctx.lineWidth = scale;
      ctx.beginPath();
      ctx.roundRect(scale / 2, scale / 2, c.width - scale, c.height - scale, 4 * scale);
      ctx.fill();
      ctx.stroke();
    }
    ctx.textBaseline = "middle";
    ctx.font = font;
    ctx.fillStyle = active ? "#EDEBE6" : "#9A9EA6";
    ctx.fillText(text, padX, c.height / 2);
    if (sub) {
      ctx.font = mono;
      ctx.fillStyle = subColor;
      ctx.fillText(sub, padX + w1 + 8 * scale, c.height / 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { texture: t, aspect: c.width / c.height };
  }, [text, sub, subColor, active]);
  useEffect(() => () => texture.dispose(), [texture]);
  const h = active ? 0.46 : 0.4;
  return (
    <sprite position={position} scale={[h * aspect, h, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}

function CameraFocus({ target }: { target: THREE.Vector3 | null }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const frames = useRef(0);
  const last = useRef<THREE.Vector3 | null>(null);
  if (last.current !== target) {
    last.current = target;
    frames.current = 90; // ease toward the focus for ~1.5s, then hand control back to the user
  }
  useFrame(() => {
    if (!controls || frames.current <= 0) return;
    frames.current -= 1;
    const goal = target ?? new THREE.Vector3(0, 0, 0);
    controls.target.lerp(goal, 0.06);
    if (target) {
      const desired = target.clone().add(new THREE.Vector3(3.2, 2.6, 5.2));
      camera.position.lerp(desired, 0.03);
    }
    controls.update();
  });
  return null;
}

export default function AgentNetwork3D({
  agents,
  selectedId,
  onSelect,
  activeEdges = [],
}: {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  activeEdges?: [string, string][];
}) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  const pos = useMemo(() => layout(agents), [agents.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const edges = useMemo(() => {
    const e: { from: string; to: string; active: boolean }[] = [];
    agents.forEach((a) => a.delegatesTo.forEach((t) => e.push({ from: a.id, to: t, active: false })));
    activeEdges.forEach(([f, t]) => {
      const ex = e.find((x) => x.from === f && x.to === t);
      if (ex) ex.active = true;
      else e.push({ from: f, to: t, active: true });
    });
    return e.filter((x) => pos[x.from] && pos[x.to]);
  }, [agents, activeEdges, pos]);

  return (
    <Canvas camera={{ position: [0, 5.4, 8.4], fov: 42 }} dpr={[1, 1.75]} onPointerMissed={() => onSelect(null)} gl={{ antialias: true, alpha: true }}>
      <Orbit radius={3.2} />
      <Orbit radius={5} />
      {edges.map((e) => {
        const from = pos[e.from];
        const to = pos[e.to];
        const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0));
        const pts = new THREE.QuadraticBezierCurve3(from, mid, to).getPoints(24);
        const involved = selectedId && (e.from === selectedId || e.to === selectedId);
        const color = e.active ? "#F06472" : involved ? "#EDEBE6" : "#3A424D";
        return (
          <group key={e.from + e.to}>
            <Line points={pts} color={color} lineWidth={e.active || involved ? 1.6 : 0.8} transparent opacity={e.active || involved ? 0.95 : 0.5} dashed={e.active} dashSize={0.15} gapSize={0.1} />
            {!reduce && <Packet from={from} to={to} color={e.active ? "#F06472" : "#EDEBE6"} speed={e.active ? 0.6 : 0.18} offset={(e.from.length * 0.37 + e.to.length * 0.11) % 1} />}
          </group>
        );
      })}
      {agents.map((a) =>
        pos[a.id] ? (
          <AgentNode key={a.id} agent={a} position={pos[a.id]} selected={selectedId === a.id} hovered={hovered === a.id} onHover={setHovered} onSelect={onSelect} />
        ) : null,
      )}
      <OrbitControls makeDefault enablePan={false} minDistance={4} maxDistance={14} autoRotate={!reduce && !selectedId && !hovered} autoRotateSpeed={0.35} enableDamping />
      <CameraFocus target={selectedId ? pos[selectedId] ?? null : null} />
    </Canvas>
  );
}
