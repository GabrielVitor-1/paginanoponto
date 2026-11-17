// The closing's gravitational field (capture → suction → collapse), extracted verbatim from the
// approved convergence (proof/ConvergenceRebuiltCanvas.tsx) without its unused proof scene.
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { plasmaFrag, plasmaVert } from "./Morph";
import { srgb } from "./site-v2-relief";

type Family = "glass" | "mercury" | "plasma";
const clamp = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const ease = (value: number, start: number, end: number) =>
  THREE.MathUtils.smootherstep(clamp((value - start) / (end - start)), 0, 1);
const seeded = (value: number) => {
  const raw = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
};

/* ── Gravitational capture ──────────────────────────────────────────────────────
 * One deterministic model for every element (scroll timeline t ∈ [0,1], + a little
 * real time so the field stays alive when the visitor pauses):
 *   A · capture  — arrives from outside the frame onto a wide orbit in a tilted
 *                  accretion disk (passes in front of / behind the nucleus);
 *   B · suction  — radius collapses exponentially while angular speed rises
 *                  (ω ∝ r^-0.95): orbits tighten, accelerate, elements stretch;
 *   C · collapse — everything is swallowed by ≈ t .585; shockwave + corona flash.
 * The nucleus itself (and the dock into the logo) is driven by the homepage Director. */
export const COLLAPSE_AT = 0.585;
const DISK_TILT = 1.2; // ≈ 69°: a wide ellipse, like a disk seen at a grazing angle
const COS_T = Math.cos(DISK_TILT),
  SIN_T = Math.sin(DISK_TILT);
type OrbitState = { r: number; s: number; theta: number; shrink: number; stretch: number };

function capture(
  t: number,
  seed: number,
  theta0: number,
  roll: number,
  time: number,
  out: THREE.Vector3,
  tangent: THREE.Vector3,
): OrbitState {
  const s1 = seeded(seed + 1),
    s2 = seeded(seed + 2),
    s3 = seeded(seed + 3);
  const arrive = ease(t, 0.02 + s1 * 0.06, 0.24 + s1 * 0.06);
  const s = ease(t, 0.25 + s2 * 0.07, 0.545 + s2 * 0.035);
  // Holds a wide, tightening orbit first, then plunges (the elements keep their identity until the end).
  const r0 = 2.15 + s3 * 1.25,
    r = THREE.MathUtils.lerp(r0 + 2.8, r0, arrive) * (1 - Math.pow(s, 2.2));
  const q = Math.max(r / r0, 0.04),
    spin = Math.min(Math.pow(q, -0.95), 8);
  const theta =
    theta0 + arrive * 1.5 + 1.55 * (spin - 1) + time * (0.1 + 0.07 * spin) * (1 - s * s);
  const lift = (s1 - 0.5) * 0.5 * q; // slight thickness of the disk, flattening as it tightens
  const x = Math.cos(theta) * r,
    d = Math.sin(theta) * r,
    cr = Math.cos(roll),
    sr = Math.sin(roll);
  const y = d * COS_T + lift,
    z = d * SIN_T;
  out.set(x * cr - y * sr, x * sr + y * cr, z);
  const tx = -Math.sin(theta),
    td = Math.cos(theta),
    ty = td * COS_T;
  tangent
    .set(tx * cr - ty * sr, tx * sr + ty * cr, td * SIN_T)
    .addScaledVector(out, (-0.35 * s) / Math.max(r, 0.2))
    .normalize();
  return { r, s, theta, shrink: ease(r, 0.12, 0.7), stretch: 1 + 2.3 * ease(s, 0.5, 0.97) };
}

const FULL = { current: 1 };
function Fragment({
  family,
  index,
  offset,
  progress,
  reveal = FULL,
}: {
  family: Family;
  index: number;
  offset: number;
  progress: MutableRefObject<number>;
  reveal?: MutableRefObject<number> | undefined;
}) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const tmp = useMemo(
    () => ({ p: new THREE.Vector3(), tan: new THREE.Vector3(), look: new THREE.Vector3() }),
    [],
  );
  const plasmaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: plasmaVert,
        fragmentShader: plasmaFrag,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
        transparent: true,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => plasmaMaterial.dispose(), [plasmaMaterial]);
  const base = 0.42 + seeded(index + 3) * 0.42,
    roll = (seeded(index + 7) - 0.5) * 0.5;
  useFrame(({ clock }) => {
    if (!group.current || !inner.current) return;
    const t = progress.current,
      o = capture(
        t,
        index,
        offset + seeded(index + 9) * 1.4,
        roll,
        clock.elapsedTime,
        tmp.p,
        tmp.tan,
      );
    group.current.position.copy(tmp.p);
    group.current.lookAt(tmp.look.copy(tmp.p).add(tmp.tan));
    const size = base * o.shrink * reveal.current;
    group.current.scale.set(
      size / Math.sqrt(o.stretch),
      size / Math.sqrt(o.stretch),
      size * o.stretch,
    ); // stretched along its path
    inner.current.rotation.set(o.theta * 0.7 + index, o.theta * 0.45, index * 0.45);
    group.current.visible = o.r > 0.03 && size > 0.002;
    plasmaMaterial.uniforms["uTime"]!.value = clock.elapsedTime * 0.6 + t * 2.4;
  });
  return (
    <group ref={group}>
      <group ref={inner}>
        {family === "glass" ? (
          <mesh>
            <dodecahedronGeometry args={[0.29, 0]} />
            <meshPhysicalMaterial
              color="#f3fbff"
              roughness={0}
              metalness={0}
              transmission={1}
              thickness={2.2}
              ior={1.45}
              specularIntensity={1}
              iridescence={1}
              iridescenceIOR={1.6}
              iridescenceThicknessRange={[100, 800]}
              dispersion={4}
              envMapIntensity={1.4}
              attenuationColor="#cfe6ff"
              attenuationDistance={4}
            />
          </mesh>
        ) : family === "mercury" ? (
          <mesh>
            <sphereGeometry args={[0.26, 64, 64]} />
            <MeshDistortMaterial
              color="#f4f6f8"
              metalness={1}
              roughness={0.02}
              distort={0.22}
              speed={0}
              envMapIntensity={3.2}
            />
          </mesh>
        ) : (
          <mesh material={plasmaMaterial}>
            <icosahedronGeometry args={[0.3, 4]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** Ruin blocks of the Módulo: dark stone cubes, ~1 in 6 with an amber core, captured by the same field. */
function ModularBand({
  progress,
  reveal = FULL,
}: {
  progress: MutableRefObject<number>;
  reveal?: MutableRefObject<number> | undefined;
}) {
  const COUNT = 110;
  const stone = useRef<THREE.InstancedMesh>(null),
    glow = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(
    () => ({
      o: new THREE.Object3D(),
      p: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      c: new THREE.Color(),
    }),
    [],
  );
  const glowing = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => seeded(i + 211) > 0.83),
    [],
  );
  useEffect(() => {
    if (!stone.current) return;
    for (let i = 0; i < COUNT; i++) {
      tmp.c.setHSL(0.07, 0.12, 0.1 + seeded(i + 8) * 0.16);
      stone.current.setColorAt(i, tmp.c);
    }
    if (stone.current.instanceColor) stone.current.instanceColor.needsUpdate = true;
  }, [tmp]);
  useFrame(({ clock }) => {
    if (!stone.current || !glow.current) return;
    const t = progress.current,
      shown = reveal.current,
      alive = shown > 0.001 && t < COLLAPSE_AT + 0.02;
    stone.current.visible = glow.current.visible = alive;
    if (!alive) return;
    for (let i = 0; i < COUNT; i++) {
      const o = capture(
        t,
        i + 400,
        -0.35 + seeded(i + 5) * 1.3,
        (seeded(i + 6) - 0.5) * 0.35,
        clock.elapsedTime,
        tmp.p,
        tmp.tan,
      );
      tmp.o.position.copy(tmp.p);
      tmp.o.rotation.set(i * 0.11 + o.theta * 0.5, i * 0.17 + o.theta * 0.3, i * 0.04);
      const size = (0.05 + seeded(i + 12) * 0.06) * o.shrink * shown * (o.r > 0.03 ? 1 : 0);
      tmp.o.scale.set(size, size, size * (1 + (o.stretch - 1) * 0.6));
      tmp.o.updateMatrix();
      stone.current.setMatrixAt(i, tmp.o.matrix);
      if (!glowing[i]) tmp.o.scale.setScalar(0);
      else tmp.o.scale.multiplyScalar(1.02);
      tmp.o.updateMatrix();
      glow.current.setMatrixAt(i, tmp.o.matrix);
    }
    stone.current.instanceMatrix.needsUpdate = true;
    glow.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={stone} args={[undefined, undefined, COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.83} metalness={0.2} vertexColors />
      </instancedMesh>
      <instancedMesh ref={glow} args={[undefined, undefined, COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ff9a3c" toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/** Spiral streams of the accretion disk: streaks flow inward along the same ω ∝ r^-0.95 law. */
const STREAM_VERT =
  "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const STREAM_FRAG = `uniform float uFlow; uniform float uAlpha; uniform vec3 uColor; uniform float uSeed; varying vec2 vUv;
void main(){ float u = vUv.x; float streak = pow(fract(u * 4.0 - uFlow + uSeed), 3.5);
  float a = streak * smoothstep(0.0, 0.18, u) * smoothstep(1.0, 0.9, u) * (0.3 + 0.7 * u) * uAlpha;
  gl_FragColor = vec4(uColor * a, a); }`;
const STREAM_COLORS = [
  "#ff9a3c",
  "#ff5c1a",
  "#d9e0e6",
  "#e8f6ff",
  "#ffb35c",
  "#c9d2d9",
  "#ff7a2a",
  "#f1ebdd",
  "#ff9a3c",
  "#bfe6ff",
];
function AccretionStreams({ progress }: { progress: MutableRefObject<number> }) {
  const spin = useRef<THREE.Group>(null);
  const streams = useMemo(
    () =>
      STREAM_COLORS.map((color, i) => {
        const points: THREE.Vector3[] = [],
          theta0 = i * ((Math.PI * 2) / STREAM_COLORS.length) + seeded(i + 70),
          rOut = 3.0 + seeded(i + 71) * 0.9;
        for (let k = 0; k <= 60; k++) {
          const r = THREE.MathUtils.lerp(rOut, 0.5, k / 60),
            q = r / rOut,
            th = theta0 + 1.55 * (Math.pow(q, -0.95) - 1);
          points.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
        }
        const geometry = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          160,
          0.011 + seeded(i + 72) * 0.01,
          6,
          false,
        );
        const material = new THREE.ShaderMaterial({
          vertexShader: STREAM_VERT,
          fragmentShader: STREAM_FRAG,
          uniforms: {
            uFlow: { value: 0 },
            uAlpha: { value: 0 },
            uColor: { value: srgb(color) },
            uSeed: { value: seeded(i + 73) },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });
        return { geometry, material, roll: (seeded(i + 74) - 0.5) * 0.4 };
      }),
    [],
  );
  useEffect(
    () => () =>
      streams.forEach((s) => {
        s.geometry.dispose();
        s.material.dispose();
      }),
    [streams],
  );
  useFrame(({ clock }) => {
    const t = progress.current,
      alpha = ease(t, 0.12, 0.28) * (1 - ease(t, 0.55, 0.6));
    if (spin.current) {
      spin.current.visible = alpha > 0.002;
      spin.current.rotation.z = clock.elapsedTime * 0.22 + t * 5;
    }
    streams.forEach((s) => {
      s.material.uniforms["uAlpha"]!.value = alpha * 1.6;
      s.material.uniforms["uFlow"]!.value = clock.elapsedTime * 0.55 + t * 9;
    });
  });
  return (
    <group rotation-x={DISK_TILT}>
      <group ref={spin}>
        {streams.map((s, i) => (
          <mesh key={i} geometry={s.geometry} material={s.material} rotation-z={s.roll} />
        ))}
      </group>
    </group>
  );
}

/** C · collapse: an amber shockwave expands along the disk the moment everything is swallowed. */
function Shockwave({ progress }: { progress: MutableRefObject<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ff9a3c",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    if (!mesh.current) return;
    const k = clamp((progress.current - COLLAPSE_AT) / 0.13);
    mesh.current.visible = k > 0 && k < 1;
    mesh.current.scale.setScalar(0.55 + 3.6 * (1 - Math.pow(1 - k, 2.4)));
    material.opacity = 0.85 * Math.pow(1 - k, 2);
  });
  return (
    <group rotation-x={DISK_TILT}>
      <mesh ref={mesh} material={material}>
        <ringGeometry args={[0.975, 1, 160]} />
      </mesh>
    </group>
  );
}

/** The four material streams (glass, chrome drops, plasma, ruin blocks). `reveal` scales them in. */
export function ConvergenceField({
  progress,
  reveal,
}: {
  progress: MutableRefObject<number>;
  reveal?: MutableRefObject<number> | undefined;
}) {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <Fragment
          key={`glass-${i}`}
          family="glass"
          index={i}
          offset={Math.PI - 0.5}
          progress={progress}
          reveal={reveal}
        />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <Fragment
          key={`metal-${i}`}
          family="mercury"
          index={i + 30}
          offset={2.2}
          progress={progress}
          reveal={reveal}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <Fragment
          key={`plasma-${i}`}
          family="plasma"
          index={i + 60}
          offset={0.3}
          progress={progress}
          reveal={reveal}
        />
      ))}
      <ModularBand progress={progress} reveal={reveal} />
      <AccretionStreams progress={progress} />
      <Shockwave progress={progress} />
    </>
  );
}
