// Profiling probe — mounted only with `?perf=1`. Splits each frame into JS (all useFrame work),
// renderer CPU and GPU time (EXT_disjoint_timer_query_webgl2), plus draw calls / triangles.
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
};

export const perfEnabled = () =>
  typeof window !== "undefined" && new URLSearchParams(location.search).has("perf");

export function PerfProbe() {
  const { gl, scene, camera } = useThree();
  const state = useMemo(() => {
    const ctx = gl.getContext() as WebGL2RenderingContext;
    const ext = ctx.getExtension("EXT_disjoint_timer_query_webgl2") as {
      TIME_ELAPSED_EXT: number;
      GPU_DISJOINT_EXT: number;
    } | null;
    return { ctx, ext, pending: [] as { q: WebGLQuery; s: Sample }[], last: performance.now() };
  }, [gl]);
  useEffect(() => {
    const w = window as PerfWindow;
    w.__ppPerf = {
      samples: [],
      frameStart: 0,
      directorMs: [],
      reset() {
        this.samples.length = 0;
        this.directorMs.length = 0;
      },
    };
    gl.info.autoReset = false;
  }, [gl]);
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
