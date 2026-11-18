// How the protagonist belongs to its environment: an aura (energy glow + plasma beams),
// a light it emits onto nearby 3D blocks, and light leaking onto the HTML cards it
// passes behind. Everything is derived from the Morph's own material weights; the
// Morph materials themselves are untouched.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cyclicMaterialWeight } from "./Morph";

/** Per material (Tinta, Vidro, Mercúrio, Plasma, Módulo): emitted colour (sRGB), aura glow, beams, light emitted onto the scene. */
const PALETTE = [
  { color: [1, 0.77, 0.42], glow: 0.14, rays: 0, emit: 0.08 },
  { color: [0.76, 0.9, 1], glow: 0.3, rays: 0, emit: 0.22 },
  { color: [0.95, 0.97, 1], glow: 0.22, rays: 0, emit: 0.16 },
  { color: [1, 0.48, 0.14], glow: 1, rays: 1, emit: 1 },
  { color: [1, 0.6, 0.1], glow: 0.55, rays: 0.12, emit: 0.6 },
] as const;

export type Presence = { color: THREE.Vector3; glow: number; rays: number; emit: number };
/** Blends the palette with the same cyclic weights the Morph uses (progress = slot / 5). */
export function materialPresence(progress: number, out: Presence) {
  out.color.set(0, 0, 0);
  out.glow = out.rays = out.emit = 0;
  let sum = 0;
  PALETTE.forEach((m, i) => {
    const w = cyclicMaterialWeight(progress, i);
    sum += w;
    out.color.x += m.color[0] * w;
    out.color.y += m.color[1] * w;
    out.color.z += m.color[2] * w;
    out.glow += m.glow * w;
    out.rays += m.rays * w;
    out.emit += m.emit * w;
  });
  if (sum > 0) {
    out.color.multiplyScalar(1 / sum);
    out.glow /= sum;
    out.rays /= sum;
    out.emit /= sum;
  }
  return out;
}

const AURA_SIZE = 6.4; // in sphere radii (diameter of the billboard)
const AURA_VERT =
  "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const AURA_FRAG = /* glsl */ `
uniform float uGlow; uniform float uRays; uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * ${AURA_SIZE.toFixed(1)}; float d = length(p); float a = atan(p.y, p.x);
  float outside = smoothstep(0.95, 1.06, d);                         // never paints over the sphere itself
  float glow = exp(-max(d - 1.0, 0.0) * 2.1) * outside;
  // Beams: integer angular frequencies keep them seamless; slow, counter-rotating layers.
  float n = 0.55 * sin(a * 13.0 + uTime * 0.45) + 0.35 * sin(a * 29.0 - uTime * 0.8 + 1.7) + 0.4 * sin(a * 7.0 + uTime * 0.22);
  float beam = pow(max(n, 0.0), 3.2);
  float reach = 1.25 + 1.05 * beam;
  float rays = beam * smoothstep(reach, 1.0, d) * outside;
  float streak = pow(max(sin(a * 5.0 + uTime * 0.12), 0.0), 60.0) * smoothstep(3.15, 1.1, d) * outside; // a few long streaks
  float flicker = 0.9 + 0.1 * sin(uTime * 3.1 + a * 3.0);
  float i = glow * uGlow * 0.5 + (rays * 0.6 + streak * 0.45) * uRays * flicker;
  i *= smoothstep(3.2, 2.6, d);
  gl_FragColor = vec4(uColor * i, i);
}`;

export type AuraUniforms = {
  uGlow: { value: number };
  uRays: { value: number };
  uTime: { value: number };
  uColor: { value: THREE.Vector3 };
};
export function useAura() {
  const uniforms = useMemo<AuraUniforms>(
    () => ({
      uGlow: { value: 0 },
      uRays: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: new THREE.Vector3(1, 0.6, 0.2) },
    }),
    [],
  );
  // depthTest off: beams and glow stay visible when the sphere is partly hidden by blocks.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: AURA_VERT,
        fragmentShader: AURA_FRAG,
        uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);
  return { uniforms, material };
}
export function Aura({ material }: { material: THREE.ShaderMaterial }) {
  return (
    <mesh material={material} renderOrder={20}>
      <planeGeometry args={[AURA_SIZE, AURA_SIZE]} />
    </mesh>
  );
}

/** Viewport box of a card (cached page geometry minus the scroll; no layout read per frame). */
export type PanelRect = { left: number; right: number; top: number; bottom: number };

/** Light leaking onto the HTML cards (`.pan`) the sphere passes behind: edges and surfaces pick up its colour. */
export class PanelLight {
  private last: string[] = [];
  update(
    panels: HTMLElement[],
    rects: PanelRect[],
    x: number,
    y: number,
    r: number,
    p: Presence,
    strength: number,
  ) {
    const rgb = `${Math.round(p.color.x * 255)} ${Math.round(p.color.y * 255)} ${Math.round(p.color.z * 255)}`;
    panels.forEach((panel, i) => {
      const b = rects[i]!;
      const nx = Math.max(b.left, Math.min(x, b.right)),
        ny = Math.max(b.top, Math.min(y, b.bottom));
      const reach = r * 2.2 + 60,
        dist = Math.hypot(x - nx, y - ny);
      const li = strength * (0.35 + 0.65 * p.emit) * Math.exp(-(dist * dist) / (reach * reach));
      const key =
        li < 0.004
          ? "0"
          : `${(x - b.left).toFixed(0)}|${(y - b.top).toFixed(0)}|${li.toFixed(3)}|${rgb}|${(r * 2.4).toFixed(0)}`;
      if (this.last[i] === key) return;
      this.last[i] = key;
      if (key === "0") {
        panel.style.removeProperty("--li");
        return;
      }
      panel.style.setProperty("--lx", `${(x - b.left).toFixed(0)}px`);
      panel.style.setProperty("--ly", `${(y - b.top).toFixed(0)}px`);
      panel.style.setProperty("--li", li.toFixed(3));
      panel.style.setProperty("--lc", rgb);
      panel.style.setProperty("--lr", `${(r * 2.4).toFixed(0)}px`);
    });
  }
}
