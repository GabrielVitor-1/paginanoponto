// Living relief background: a dark mineral/topographic surface locked to the page,
// revealed by a soft cool (mineral cyan) light that follows the nucleus and its trail.
// Rendered as the first, full-screen quad of the SAME journey canvas (no extra canvas,
// no extra loop). The Director in site-v2-webgl.tsx writes its uniforms each frame.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildReliefData, RELIEF_SIZE } from "./relief-data";
import type { ReliefData } from "./relief-data";

/** All tuning in one place. Colours are sRGB 0..1; lengths in CSS px. */
export const RELIEF = {
  tile: 1400, // page px covered by one macro tile of the relief
  microTile: 310, // finer mineral grain tile
  ambient: 2.2 / 255, // resting relief amplitude around #070707 (graphite on black)
  gain: 0.85, // how strongly the light reveals crests
  ceiling: 0.14, // max light contribution (≈ #0f2426 on top of the base) — legibility guard
  flatLight: 0.05, // share of light that is not relief-driven (keeps it atmospheric, not a stain)
  contour: 0.14,
  color: "#57c9d7", // cool mineral cyan: contrast to the amber nucleus (amber stays on core, plasma, dot, accents)
  // topographic iso-lines, only inside lit zones
  trailSeconds: 1.15, // energy time-constant of the trail (≈ 3 s to fade out)
  trailPoints: 16,
} as const;

const SIZE = RELIEF_SIZE;
/** Raw sRGB triple (no colour-management conversion): these shaders write display values directly. */
export const srgb = (hex: string) =>
  new THREE.Vector3(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );

/** GPU textures from the relief pixels (built in a worker, see `loadReliefData`). */
function buildReliefTexture(data: ReliefData) {
  const albedoTexture = new THREE.DataTexture(data.albedo, SIZE, SIZE, THREE.RGBAFormat);
  albedoTexture.wrapS = albedoTexture.wrapT = THREE.RepeatWrapping;
  albedoTexture.repeat.set(4, 2);
  albedoTexture.colorSpace = THREE.SRGBColorSpace;
  albedoTexture.magFilter = THREE.LinearFilter;
  albedoTexture.minFilter = THREE.LinearMipmapLinearFilter;
  albedoTexture.generateMipmaps = true;
  albedoTexture.needsUpdate = true;
  const texture = new THREE.DataTexture(data.packed, SIZE, SIZE, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return { packed: texture, albedo: albedoTexture };
}

let reliefData: ReliefData | null = null;
let loading: Promise<void> | null = null;
/** Generates the relief pixels in a Web Worker so the main thread stays free while the page
 *  loads. Falls back to the main thread where workers are unavailable. Resolves once ready. */
export function loadReliefData(): Promise<void> {
  if (reliefData) return Promise.resolve();
  return (loading ??= new Promise<void>((resolve) => {
    const fallback = () => {
      reliefData ??= buildReliefData();
      resolve();
    };
    try {
      const worker = new Worker(new URL("./relief-worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<ReliefData>) => {
        reliefData = event.data;
        worker.terminate();
        resolve();
      };
      worker.onerror = () => {
        worker.terminate();
        fallback();
      };
    } catch {
      fallback();
    }
  }));
}

let cached: ReturnType<typeof buildReliefTexture> | null = null;
/** Generated once per page and shared by the background plane and the environment map. */
export const getReliefTextures = () =>
  (cached ??= buildReliefTexture((reliefData ??= buildReliefData())));

const VERT = /* glsl */ `void main(){ gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;
const FRAG = /* glsl */ `
#define N ${RELIEF.trailPoints}
uniform sampler2D uTex; uniform vec2 uRes; uniform float uDpr; uniform float uScroll;
uniform vec4 uTrail[N]; uniform int uCount; uniform vec4 uLive;
uniform float uIntensity; uniform float uPulse; uniform float uDebug; uniform vec3 uColor; uniform vec3 uTune; // gain, ceiling, ambient
const vec3 BASE = vec3(7.0/255.0);
// Accumulates one light segment a→b (page px, xy) with radius/energy interpolated along it.
void seg(vec2 p, vec4 a, vec4 b, inout float e, inout vec2 dir){
  vec2 ab = b.xy - a.xy; float t = clamp(dot(p - a.xy, ab) / max(dot(ab, ab), 1e-3), 0.0, 1.0);
  vec2 c = a.xy + ab * t; float r = mix(a.z, b.z, t); float en = mix(a.w, b.w, t);
  vec2 d = p - c; float dd = dot(d, d);
  if (dd > r * r * 4.84 || en < 0.01) return;               // beyond 2.2·r: contributes < 0.05 %, skip the exp/normalize
  float w = en * exp(-dd / (r * r) * 1.6);
  e = 1.0 - (1.0 - e) * (1.0 - w);                       // soft union: continuous, never additive blow-out
  dir += w * normalize(d + vec2(1e-3));
}
void main(){
  vec2 css = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 p = css + vec2(0.0, uScroll);                        // page space: the relief is glued to the content
  vec4 m = texture2D(uTex, p / ${RELIEF.tile.toFixed(1)});
  vec4 g = texture2D(uTex, p / ${RELIEF.microTile.toFixed(1)} + vec2(0.37, 0.61));
  vec3 n = normalize(vec3((m.xy - 0.5) * 2.0 + (g.xy - 0.5) * 0.35, 1.0));
  float curv = (m.a - 0.5) * 2.0 + (g.a - 0.5) * 0.25;
  // Resting state: graphite on black, lit by a faint fixed sky from the top-left.
  float rest = dot(n, normalize(vec3(-0.45, -0.6, 0.65))) - 0.62 + curv * 0.6;
  vec3 col = BASE + vec3(rest) * uTune.z * vec3(1.0, 0.98, 0.95);
  // Cool light from the nucleus and its trail.
  float e = 0.0; vec2 dir = vec2(0.0);
  if (uCount > 0) {
    for (int i = 0; i < N - 1; i++) { if (i + 1 >= uCount) break; seg(p, uTrail[i], uTrail[i + 1], e, dir); }
    seg(p, uTrail[uCount - 1], uLive, e, dir);
  } else { seg(p, uLive, uLive, e, dir); }
  if (uDebug > 0.5) { vec3 Ld = normalize(vec3(-normalize(dir + vec2(1e-4)), 0.42)); gl_FragColor = uDebug > 1.5 ? vec4(fract(p.y / 1000.0), e, fract(p.x / 1000.0), 1.0) : vec4(e, max(dot(n, Ld), 0.0) * step(0.002, e), curv * 0.5 + 0.5, 1.0); return; }
  if (e > 0.002) {
    vec3 L = normalize(vec3(-normalize(dir + vec2(1e-4)), 0.42));   // grazing light from the nucleus
    float lam = max(dot(n, L), 0.0);
    float crest = smoothstep(-0.05, 0.6, curv);                 // ridges catch the light, cavities stay dark
    float cavity = smoothstep(0.05, -0.5, curv);
    float h = m.b; float iso = abs(fract(h * 10.0) - 0.5); float line = 1.0 - smoothstep(0.0, fwidth(h * 10.0) * 1.4, iso);
    float reveal = lam * lam * (0.55 + 0.9 * crest) * (1.0 - 0.75 * cavity) + ${RELIEF.flatLight.toFixed(3)} + line * ${RELIEF.contour.toFixed(3)} * lam;
    float light = min(reveal * uTune.x * e * uIntensity * uPulse, uTune.y);
    col += uColor * light;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export type ReliefUniforms = {
  uTex: { value: THREE.Texture | null };
  uRes: { value: THREE.Vector2 };
  uDpr: { value: number };
  uScroll: { value: number };
  uTrail: { value: THREE.Vector4[] };
  uCount: { value: number };
  uLive: { value: THREE.Vector4 };
  uIntensity: { value: number };
  uPulse: { value: number };
  uDebug: { value: number };
  uColor: { value: THREE.Vector3 };
  uTune: { value: THREE.Vector3 };
};

export function useReliefUniforms(): ReliefUniforms {
  return useMemo(
    () => ({
      uTex: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: 1 },
      uScroll: { value: 0 },
      uTrail: { value: Array.from({ length: RELIEF.trailPoints }, () => new THREE.Vector4()) },
      uCount: { value: 0 },
      uLive: { value: new THREE.Vector4() },
      uIntensity: { value: 1 },
      uPulse: { value: 1 },
      uDebug: { value: 0 },
      uColor: { value: srgb(RELIEF.color) },
      uTune: { value: new THREE.Vector3(RELIEF.gain, RELIEF.ceiling, RELIEF.ambient) },
    }),
    [],
  );
}

/** Page-space trail of the nucleus. Points are pushed by distance, energies decay with time. */
export class ReliefTrail {
  points: THREE.Vector4[] = [];
  /** Samples kept (quality profile). Fewer samples are spaced further apart, so the trail keeps its length. */
  maxPoints: number = RELIEF.trailPoints;
  private pool: THREE.Vector4[] = [];
  update(x: number, y: number, radius: number, dt: number, reduced: boolean) {
    const decay = Math.exp(-dt / RELIEF.trailSeconds);
    for (const p of this.points) p.w *= decay;
    while (this.points.length && this.points[0]!.w < 0.01) this.pool.push(this.points.shift()!);
    const last = this.points[this.points.length - 1];
    const spacing = Math.max(14, radius * 0.3) * (RELIEF.trailPoints / this.maxPoints);
    if (!reduced && (!last || Math.hypot(x - last.x, y - last.y) > spacing)) {
      this.points.push((this.pool.pop() ?? new THREE.Vector4()).set(x, y, radius, 1));
      while (this.points.length > this.maxPoints) this.pool.push(this.points.shift()!);
    }
  }
  write(u: ReliefUniforms) {
    const n = this.points.length;
    u.uCount.value = n;
    for (let i = 0; i < n; i++) u.uTrail.value[i]!.copy(this.points[i]!);
  }
}

export function ReliefBackground({ uniforms }: { uniforms: ReliefUniforms }) {
  const texture = useMemo(() => getReliefTextures().packed, []);
  // Built by hand so the material holds *these* uniform objects by reference: the Director
  // mutates them every frame (passing them as a JSX prop left the GPU with stale copies).
  const material = useMemo(() => {
    uniforms.uTex.value = texture;
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
  }, [texture, uniforms]);
  useEffect(() => () => material.dispose(), [material]); // textures are page-lifetime singletons
  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
