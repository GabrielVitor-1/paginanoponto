// Profiling probe — mounted only with `?perf=1`. Splits each frame into JS (all useFrame work),
// renderer CPU and GPU time (EXT_disjoint_timer_query_webgl2), plus draw calls / triangles,
// and shows them in a small on-device panel (updated 4×/s so it barely costs anything).
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";

type Sample = {
  t: number;
  frame: number;
  js: number;
  render: number;
  gpu: number;
  calls: number;
  tris: number;
  programs: number;
  scroll: number;
};
type PerfWindow = Window & {
  __ppPerf?: { samples: Sample[]; frameStart: number; directorMs: number[]; reset: () => void };
  __ppQuality?: string;
  __ppQualityChanges?: number;
};

const MAX_SAMPLES = 20000; // ≈ 5 min at 60 fps; keeps perf mode itself from growing without bound

let enabled: boolean | null = null;
export const perfEnabled = () =>
  (enabled ??= typeof window !== "undefined" && new URLSearchParams(location.search).has("perf"));

const pct = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]! : 0;
const fmt = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "—");

/** Small fixed panel. Built with plain DOM (no React updates per frame). */
function createPanel() {
  const box = document.createElement("div");
  box.setAttribute("role", "status");
  box.style.cssText =
    "position:fixed;left:8px;top:8px;z-index:9999;max-width:calc(100vw - 16px);padding:8px 10px;" +
    "background:rgb(0 0 0 / 82%);color:#d7f7d0;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;" +
    "border:1px solid #2f4d2b;border-radius:6px;contain:content;pointer-events:auto;white-space:pre";
  const text = document.createElement("div");
  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;gap:6px;margin-top:6px";
  const button = (label: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      "font:inherit;color:#070707;background:#d7f7d0;border:0;border-radius:4px;padding:3px 8px;cursor:pointer";
    bar.append(b);
    return b;
  };
  const reset = button("Zerar"),
    copy = button("Copiar"),
    hide = button("Ocultar");
  box.append(text, bar);
  document.body.append(box);
  hide.addEventListener("click", () => {
    const shown = text.style.display !== "none";
    text.style.display = shown ? "none" : "";
    hide.textContent = shown ? "Mostrar" : "Ocultar";
  });
  return { box, text, reset, copy };
}

export function PerfProbe() {
  const { gl, scene, camera } = useThree();
  const state = useMemo(() => {
    const ctx = gl.getContext() as WebGL2RenderingContext;
    const ext = ctx.getExtension("EXT_disjoint_timer_query_webgl2") as {
      TIME_ELAPSED_EXT: number;
      GPU_DISJOINT_EXT: number;
    } | null;
    return {
      ctx,
      ext,
      pending: [] as { q: WebGLQuery; s: Sample }[],
      last: performance.now(),
      // Session counters since the last reset (shown in the panel).
      frames: 0,
      over33: 0,
      over50: 0,
      worst: 0,
      since: performance.now(),
      resizes: 0,
      longTasks: 0,
      longest: 0,
    };
  }, [gl]);
  useEffect(() => {
    const w = window as PerfWindow;
    const resetCounters = () => {
      state.frames = state.over33 = state.over50 = state.worst = 0;
      state.longTasks = state.longest = 0;
      state.since = performance.now();
    };
    w.__ppPerf = {
      samples: [],
      frameStart: 0,
      directorMs: [],
      reset() {
        this.samples.length = 0;
        this.directorMs.length = 0;
        resetCounters();
      },
    };
    gl.info.autoReset = false;

    // Canvas resizes (e.g. the mobile toolbar showing/hiding) reallocate every GPU buffer.
    const canvas = gl.domElement;
    let lastSize = ""; // the first observation is the initial size, not a resize
    const sizeWatch = new ResizeObserver(() => {
      const now = `${canvas.width}x${canvas.height}`;
      if (lastSize && now !== lastSize) state.resizes++;
      lastSize = now;
    });
    sizeWatch.observe(canvas);
    let longTaskWatch: PerformanceObserver | null = null;
    try {
      longTaskWatch = new PerformanceObserver((list) =>
        list.getEntries().forEach((e) => {
          state.longTasks++;
          state.longest = Math.max(state.longest, e.duration);
        }),
      );
      longTaskWatch.observe({ type: "longtask" });
    } catch {
      longTaskWatch = null; // Safari/Firefox: no Long Tasks API
    }

    const panel = createPanel();
    const summary = () => {
      const p = w.__ppPerf!,
        now = performance.now(),
        recent = p.samples.filter((s) => now - s.t < 5000),
        last1 = recent.filter((s) => now - s.t < 1000);
      const frames = recent.map((s) => s.frame).sort((a, b) => a - b);
      const gpu = recent.map((s) => s.gpu).filter((g) => g >= 0);
      const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
      const span = (a: Sample[]) => (a.length > 1 ? (a[a.length - 1]!.t - a[0]!.t) / 1000 : 0);
      const lastS = recent[recent.length - 1];
      return {
        fps: last1.length > 1 ? (last1.length - 1) / span(last1) : 0,
        fps5: recent.length > 1 ? (recent.length - 1) / span(recent) : 0,
        frameAvg: avg(frames),
        p95: pct(frames, 0.95),
        js: avg(recent.map((s) => s.js)),
        render: avg(recent.map((s) => s.render)),
        gpu: gpu.length ? avg(gpu) : NaN,
        over33: state.over33,
        over50: state.over50,
        worst: state.worst,
        frames: state.frames,
        seconds: (now - state.since) / 1000,
        dpr: gl.getPixelRatio(),
        deviceDpr: window.devicePixelRatio || 1,
        quality: w.__ppQuality ?? "?",
        qualityChanges: w.__ppQualityChanges ?? 0,
        calls: lastS?.calls ?? 0,
        tris: lastS?.tris ?? 0,
        canvas: `${canvas.width}×${canvas.height}`,
        css: `${canvas.clientWidth}×${canvas.clientHeight}`,
        resizes: state.resizes,
        longTasks: longTaskWatch ? state.longTasks : NaN,
        longest: longTaskWatch ? state.longest : NaN,
        gpuTimer: !!state.ext,
        build: document.documentElement.dataset["build"] ?? "",
      };
    };
    const paint = () => {
      const s = summary();
      panel.text.textContent =
        `FPS ${fmt(s.fps, 0)}  média 5 s ${fmt(s.fps5, 0)}\n` +
        `quadro ${fmt(s.frameAvg)} ms  p95 ${fmt(s.p95)} ms\n` +
        `quedas >33 ms ${s.over33}  >50 ms ${s.over50}  pior ${fmt(s.worst, 0)} ms\n` +
        `JS ${fmt(s.js, 2)}  render ${fmt(s.render, 2)}  GPU ${s.gpuTimer ? fmt(s.gpu, 2) : "n/d"} ms\n` +
        `perfil ${s.quality} (${s.qualityChanges} troca${s.qualityChanges === 1 ? "" : "s"})\n` +
        `DPR ${fmt(s.dpr, 2)} de ${fmt(s.deviceDpr, 2)}  canvas ${s.canvas}\n` +
        `draw calls ${s.calls}  triângulos ${s.tris.toLocaleString("pt-BR")}\n` +
        `redimensionamentos ${s.resizes}  long tasks ${Number.isNaN(s.longTasks) ? "n/d" : `${s.longTasks} (máx ${fmt(s.longest, 0)} ms)`}` +
        (s.build ? `\nbuild ${s.build}` : "");
    };
    const timer = setInterval(paint, 250);
    panel.reset.addEventListener("click", () => w.__ppPerf?.reset());
    panel.copy.addEventListener("click", () => {
      const s = summary();
      const report = JSON.stringify({
        ...s,
        ua: navigator.userAgent,
        at: new Date().toISOString(),
      });
      navigator.clipboard?.writeText(report).then(
        () => (panel.copy.textContent = "Copiado"),
        () => window.prompt("Copie o relatório:", report),
      );
      setTimeout(() => (panel.copy.textContent = "Copiar"), 1500);
    });
    return () => {
      clearInterval(timer);
      sizeWatch.disconnect();
      longTaskWatch?.disconnect();
      panel.box.remove();
    };
  }, [gl, state]);
  // Runs first: marks the start of the frame's JS work.
  useFrame(() => {
    const p = (window as PerfWindow).__ppPerf;
    if (p) p.frameStart = performance.now();
  }, -1000);
  // Takes over rendering (priority > 0) so the render call itself can be timed on CPU and GPU.
  useFrame(() => {
    const p = (window as PerfWindow).__ppPerf;
    if (!p) return;
    const now = performance.now(),
      { ctx, ext } = state;
    const s: Sample = {
      t: now,
      frame: now - state.last,
      js: now - p.frameStart,
      render: 0,
      gpu: -1,
      calls: 0,
      tris: 0,
      programs: 0,
      scroll: scrollY,
    };
    state.last = now;
    state.frames++;
    if (s.frame > 33.4) state.over33++;
    if (s.frame > 50) state.over50++;
    // A hidden tab pauses rAF; that gap is not a dropped frame.
    if (s.frame < 1000) state.worst = Math.max(state.worst, s.frame);
    gl.info.reset();
    const q = ext ? ctx.createQuery() : null;
    if (q && ext) ctx.beginQuery(ext.TIME_ELAPSED_EXT, q);
    const r0 = performance.now();
    gl.render(scene, camera);
    s.render = performance.now() - r0;
    if (q && ext) {
      ctx.endQuery(ext.TIME_ELAPSED_EXT);
      state.pending.push({ q, s });
    }
    s.calls = gl.info.render.calls;
    s.tris = gl.info.render.triangles;
    s.programs = gl.info.programs?.length ?? 0;
    if (p.samples.length >= MAX_SAMPLES) p.samples.splice(0, MAX_SAMPLES / 4);
    p.samples.push(s);
    // Resolve finished GPU queries (they complete a few frames later).
    while (state.pending.length && ext) {
      const { q: head, s: hs } = state.pending[0]!;
      if (!ctx.getQueryParameter(head, ctx.QUERY_RESULT_AVAILABLE)) break;
      if (!ctx.getParameter(ext.GPU_DISJOINT_EXT))
        hs.gpu = (ctx.getQueryParameter(head, ctx.QUERY_RESULT) as number) / 1e6;
      ctx.deleteQuery(head);
      state.pending.shift();
    }
  }, 1);
  return null;
}
