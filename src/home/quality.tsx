// Rendering quality without changing the experience:
// - ShaderWarmup compiles every material once, at load, so no material freezes the page the
//   first time it appears (measured: 250–1,200 ms stalls on first scroll).
// - QualityGovernor adapts the internal resolution (DPR) and the relief's trail samples to the
//   device, with hysteresis so the profile never flickers back and forth.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import type { ReliefTrail } from "./site-v2-relief";

export type QualityName = "alta" | "equilibrada" | "economica";
type Profile = { dpr: number; trail: number };
/** Alta: full experience · Equilibrada: same experience, lower internal resolution ·
 *  Econômica: same narrative and effects, resolution 1× and fewer trail samples. */
export const PROFILES: Record<QualityName, Profile> = {
  alta: { dpr: 1.5, trail: 16 },
  equilibrada: { dpr: 1.25, trail: 16 },
  economica: { dpr: 1, trail: 10 },
};
const ORDER: QualityName[] = ["alta", "equilibrada", "economica"];

const forced = (): QualityName | null => {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(location.search).get("qualidade");
  return q && q in PROFILES ? (q as QualityName) : null;
};

let software: boolean | null = null;
/** True when WebGL runs on a software rasteriser (GPU blocklisted, VMs, old drivers). */
export function softwareRenderer(): boolean {
  if (software !== null) return software;
  software = false;
  try {
    const ctx = document.createElement("canvas").getContext("webgl2");
    const info = ctx?.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(ctx!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    ctx?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    software = false;
  }
  return software;
}

/** Starting profile from device hints; measurements take over afterwards. */
export function initialQuality(): QualityName {
  const f = forced();
  if (f) return f;
  if (softwareRenderer()) return "economica";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8,
    memory = nav.deviceMemory ?? 8,
    coarse = matchMedia("(pointer: coarse)").matches;
  if (cores <= 4 || memory <= 2) return "economica";
  if (coarse || memory <= 4) return "equilibrada";
  return "alta";
}

const cappedDpr = (q: QualityName) => Math.min(window.devicePixelRatio || 1, PROFILES[q].dpr);

export function ShaderWarmup() {
  const { gl, scene, camera } = useThree();
  const phase = useRef<"idle" | "compiling" | "draw" | "done">("idle");
  const reveal = () => {
    const changed: { o: THREE.Object3D; visible: boolean; culled: boolean }[] = [];
    scene.traverse((o) => {
      changed.push({ o, visible: o.visible, culled: o.frustumCulled });
      o.visible = true;
      o.frustumCulled = false;
    });
    return () =>
      changed.forEach((c) => ((c.o.visible = c.visible), (c.o.frustumCulled = c.culled)));
  };
  useEffect(() => {
    // Error checking forces the main thread to wait for each shader link; keep it for development.
    gl.debug.checkShaderErrors = import.meta.env.DEV;
  }, [gl]);
  useFrame(() => {
    // Software rasterisers would spend tens of seconds compiling and drawing everything up front;
    // they keep the previous on-demand behaviour.
    if (phase.current === "idle" && softwareRenderer()) phase.current = "done";
    if (phase.current === "idle") {
      // 1) Programs: compile every material while the hero is on screen (linking runs in parallel).
      phase.current = "compiling";
      const restore = reveal();
      const pending = gl.compileAsync(scene, camera);
      restore();
      pending.then(
        () => (phase.current = "draw"),
        () => (phase.current = "draw"),
      );
    } else if (phase.current === "draw") {
      // 2) Native shaders: ANGLE/D3D finishes some shaders only at their first draw, so every
      //    object (and the glass transmission pass) is drawn once into a 1-pixel scissor. The
      //    regular render of this same frame clears and redraws the whole canvas right after.
      phase.current = "done";
      const restore = reveal();
      gl.setScissorTest(true);
      gl.setScissor(0, 0, 1, 1);
      gl.render(scene, camera);
      gl.setScissorTest(false);
      restore();
    }
  });
  return null;
}

export function QualityGovernor({ trail }: { trail: ReliefTrail }) {
  const { setDpr } = useThree();
  const state = useRef({
    q: "alta" as QualityName,
    samples: [] as number[],
    windowStart: 0,
    slow: 0,
    fast: 0,
    lastChange: 0,
    changes: 0,
    downgraded: false,
    started: 0,
  });
  const apply = (q: QualityName) => {
    state.current.q = q;
    trail.maxPoints = PROFILES[q].trail;
    setDpr(cappedDpr(q));
    const w = window as Window & { __ppQuality?: QualityName; __ppQualityChanges?: number };
    if (w.__ppQuality !== undefined) w.__ppQualityChanges = (w.__ppQualityChanges ?? 0) + 1;
    w.__ppQuality = q;
  };
  useEffect(() => {
    apply(initialQuality());
    state.current.started = performance.now();
  }, []);
  useFrame((_, delta) => {
    const s = state.current,
      now = performance.now();
    if (forced() || document.hidden || now - s.started < 4000) return; // let warmup and fonts settle
    s.samples.push(delta * 1000);
    if (!s.windowStart) s.windowStart = now;
    if (now - s.windowStart < 1500) return;
    // Median of the window: a single long frame (e.g. a GC) cannot trigger a change.
    const sorted = s.samples.sort((a, b) => a - b),
      median = sorted[Math.floor(sorted.length / 2)]!;
    s.samples.length = 0;
    s.windowStart = now;
    s.slow = median > 22 ? s.slow + 1 : 0; // below ~45 fps
    s.fast = median < 17.5 ? s.fast + 1 : 0; // holding ~60 fps
    const idx = ORDER.indexOf(s.q),
      cooled = now - s.lastChange > 6000 && s.changes < 3;
    if (cooled && s.slow >= 2 && idx < ORDER.length - 1) {
      apply(ORDER[idx + 1]!);
      s.lastChange = now;
      s.changes++;
      s.slow = 0;
      s.downgraded = true; // once lowered, never raised again during the visit (no oscillation)
    } else if (cooled && !s.downgraded && s.fast >= 8 && idx > 0 && ORDER[idx - 1] !== undefined) {
      apply(ORDER[idx - 1]!);
      s.lastChange = now;
      s.changes++;
      s.fast = 0;
    }
  });
  return null;
}
