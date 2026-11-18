// The homepage journey and the closing share ONE persistent R3F canvas and ONE
// protagonist (the journey Morph). A single Director (useFrame, priority -1) derives
// every phase from one smoothed scroll value, so nothing is mounted, unmounted,
// hidden or swapped while the sphere travels, converges and docks into the logo.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import * as THREE from "three";
import { Morph } from "./Morph";
import { COLLAPSE_AT, ConvergenceField } from "./convergence-field";
import { WP } from "./waypoints";
import {
  getReliefTextures,
  loadReliefData,
  ReliefBackground,
  ReliefTrail,
  useReliefUniforms,
} from "./site-v2-relief";
import { Aura, materialPresence, PanelLight, useAura } from "./site-v2-presence";
import type { AuraUniforms, PanelRect, Presence } from "./site-v2-presence";
import type { ReliefUniforms } from "./site-v2-relief";
import { PerfProbe, perfEnabled } from "./perf-probe";
import { initialQuality, PROFILES, QualityGovernor, seg, ShaderWarmup } from "./quality";
import "./site-v2-webgl.css";

// Starts as soon as this chunk loads, in parallel with React mounting the page.
const reliefPixels = typeof window === "undefined" ? Promise.resolve() : loadReliefData();

const MATS = ["Tinta", "Vidro", "Mercúrio", "Plasma", "Módulo"];
const CLOSING_LIGHTS = [60, 40, 14] as const;
/** Journey intensity of the same lights. The closing rig used to duplicate the two journey spot
 *  lights (same position, cone, colour); light is additive, so one light per position carrying the
 *  summed intensity renders the same pixels with two fewer lights in every lit shader. */
const JOURNEY_LIGHTS = [60, 40, 0] as const;
const SLOT_SECONDS = 2.8; // one material per 2.8 s, as in the approved prototype
const CORE_WORLD_RADIUS = 0.5; // same visual size as the previous closing core (.58 × .86)
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (value: number) => value * value * (3 - 2 * value);
const band = (value: number, start: number, end: number) =>
  THREE.MathUtils.smootherstep(value, start, end);
const cr = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 *
  (2 * b +
    (-a + c) * t +
    (2 * a - 5 * b + 4 * c - d) * t * t +
    (-a + 3 * b - 3 * c + d) * t * t * t);
const cubic = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/** Closing phase boundaries on the pinned timeline t ∈ [0,1]. Absorption (ConvergenceField) ends ≈ .675;
 *  `markAtDock` is a fraction of the docking arc, not of t. */
const PHASE = {
  reveal: [0, 0.12],
  ornament: [0.3, 0.5],
  markAtDock: 0.4,
  dock: [0.7, 0.9],
  slogan: 0.93,
} as const;

export type Stage = {
  scroll: number;
  entry: number;
  t: number;
  exit: number;
  dock: number;
  docked: boolean;
  core: { x: number; y: number; r: number };
  dot: { x: number; y: number; r: number } | null;
  material: number;
  materialName: string;
  reduced: boolean;
};

type Shared = {
  anchor: RefObject<THREE.Group | null>;
  rim: RefObject<THREE.ShaderMaterial | null>;
  corona: RefObject<THREE.ShaderMaterial | null>;
  aura: AuraUniforms;
  emit: RefObject<THREE.PointLight | null>;
  fill: RefObject<THREE.PointLight | null>;
  lights: RefObject<(THREE.Light | null)[]>;
  material: MutableRefObject<number>;
  ornament: MutableRefObject<number>;
  closing: MutableRefObject<number>;
  reveal: MutableRefObject<number>;
  relief: ReliefUniforms | null; // null when the relief is disabled (?fundo=0)
  trail: ReliefTrail;
};

const JOURNEY_CAMERA = new THREE.Vector3(0, 0, 5.2);
/** The convergence camera path, unchanged from the approved closing (plus a portrait fit). */
function closingCamera(t: number, aspect: number, out: THREE.Vector3) {
  const close = band(t, 0.38, 0.58),
    release = band(t, 0.48, 0.6),
    fit = Math.max(1, 0.75 / aspect);
  return out.set(
    lerp(-0.34, 0, release),
    lerp(0.18, 0, release),
    (lerp(8.5, 6.3, close) + release * 1.3) * fit,
  );
}

function Director({
  root,
  targetRef,
  reduced,
  shared,
}: {
  root: RefObject<HTMLElement | null>;
  targetRef: RefObject<HTMLSpanElement | null>;
  reduced: MutableRefObject<boolean>;
  shared: Shared;
}) {
  const { camera, size } = useThree();
  const tmp = useMemo(
    () => ({
      cam: new THREE.Vector3(),
      ray: new THREE.Vector3(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
    }),
    [],
  );
  const state = useRef({
    smoothed: typeof window === "undefined" ? 0 : scrollY,
    waypoints: [] as number[],
    convTop: 0,
    convHeight: 1,
    slot: 0,
    dockedAt: null as number | null,
    dockBase: 0,
    pointer: { x: 0, y: 0 },
    light: null as null | { x: number; y: number },
    panelLight: new PanelLight(),
    presence: { color: new THREE.Vector3(), glow: 0, rays: 0, emit: 0 } as Presence,
    // Page-space geometry of the `.pan` cards and #sys, refreshed on resize (not read per frame).
    panelBoxes: [] as { left: number; width: number; top: number; height: number }[],
    panelRects: [] as PanelRect[],
    sysTop: 0,
    sysBottom: 0,
    dot: { x: 0, y: 0, r: 0 },
    stage: null as Stage | null,
  });
  const dom = useRef<{
    mark?: HTMLElement | null;
    tag?: HTMLElement | null;
    cap?: HTMLElement | null;
    mat?: HTMLElement | null;
    panels?: HTMLElement[];
    sys?: HTMLElement | null;
  }>({});

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const s = state.current;
    dom.current = {
      mark: host.querySelector(".mark"),
      tag: host.querySelector(".tag"),
      cap: host.querySelector(".cap"),
      mat: host.querySelector(".mat"),
      panels: [...host.querySelectorAll<HTMLElement>(".pan")],
      sys: host.querySelector("#sys"),
    };
    const measure = () => {
      s.waypoints = WP.map((waypoint) => {
        const rect = host.querySelector<HTMLElement>(`#${waypoint[0]}`)!.getBoundingClientRect();
        return rect.top + scrollY + waypoint[1] * rect.height;
      });
      const conv = host.querySelector<HTMLElement>("#conv")!.getBoundingClientRect();
      s.convTop = conv.top + scrollY;
      s.convHeight = conv.height;
      const sysRect = dom.current.sys?.getBoundingClientRect();
      s.sysTop = sysRect ? sysRect.top + scrollY : 0;
      s.sysBottom = sysRect ? sysRect.bottom + scrollY : 0;
      s.panelBoxes = (dom.current.panels ?? []).map((panel) => {
        const r = panel.getBoundingClientRect();
        return { left: r.left, width: r.width, top: r.top + scrollY, height: r.height };
      });
      s.panelRects = s.panelBoxes.map(() => ({ left: 0, right: 0, top: 0, bottom: 0 }));
    };
    const onPointer = (event: MouseEvent) => {
      s.pointer.x = event.clientX / innerWidth - 0.5;
      s.pointer.y = event.clientY / innerHeight - 0.5;
    };
    const buttons = [...host.querySelectorAll<HTMLButtonElement>("[data-reduced]")],
      skip = host.querySelector<HTMLButtonElement>("[data-skip]");
    const syncPressed = () =>
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(reduced.current)));
    syncPressed();
    const toggleReduced = () => {
      reduced.current = !reduced.current;
      syncPressed();
    };
    // In-page links (brand → hero, Projetos, Contato…): smooth unless motion is reduced.
    const onAnchor = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey)
        return;
      const id = link.getAttribute("href")!.slice(1),
        target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      const behavior: ScrollBehavior = reduced.current ? "auto" : "smooth";
      scrollTo({ top: id === "hero" ? 0 : target.getBoundingClientRect().top + scrollY, behavior });
      history.replaceState(
        null,
        "",
        id === "hero" ? location.pathname + location.search : `#${id}`,
      );
    };
    const onSkip = () => {
      measure();
      scrollTo({
        top: s.convTop + s.convHeight - innerHeight,
        behavior: reduced.current ? "auto" : "smooth",
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    addEventListener("resize", measure);
    addEventListener("mousemove", onPointer);
    buttons.forEach((b) => b.addEventListener("click", toggleReduced));
    skip?.addEventListener("click", onSkip);
    host.addEventListener("click", onAnchor);
    document.fonts?.ready.then(measure);
    measure();
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
      removeEventListener("mousemove", onPointer);
      buttons.forEach((b) => b.removeEventListener("click", toggleReduced));
      skip?.removeEventListener("click", onSkip);
      host.removeEventListener("click", onAnchor);
    };
  }, [root, reduced]);

  useFrame((frame, delta) => {
    const perfStart = performance.now();
    const s = state.current,
      w = size.width,
      h = size.height,
      anchor = shared.anchor.current;
    if (
      !anchor ||
      !h ||
      s.waypoints.length < WP.length ||
      !(camera instanceof THREE.PerspectiveCamera)
    )
      return;
    const R = reduced.current;

    // ── Journey: identical to the approved controller (same WP, spline, mobile and reduced rules). ──
    s.smoothed += (scrollY - s.smoothed) * (R ? 1 : 0.07);
    const S = s.smoothed,
      wy = s.waypoints;
    let index = 0;
    while (index < WP.length - 2 && S + innerHeight * 0.5 >= wy[index + 1]!) index++;
    const amount = clamp((S + innerHeight * 0.5 - wy[index]!) / (wy[index + 1]! - wy[index]!)),
      u = ease(amount);
    const a = WP[Math.max(0, index - 1)]!,
      b = WP[index]!,
      c = WP[index + 1]!,
      d = WP[Math.min(WP.length - 1, index + 2)]!,
      mobile = innerWidth < 800;
    let jx = cr(a[2], b[2], c[2], d[2], u),
      jy = cr(a[3], b[3], c[3], d[3], u),
      jr = (b[4] + (c[4] - b[4]) * u) * Math.min(innerWidth, innerHeight) * 0.3;
    if (mobile) {
      jx = 0.5 + (jx - 0.5) * 0.4;
      jy = 0.16 + jy * 0.3;
      jr *= 0.62;
    }
    if (R) jy = 0.5 + (jy - 0.5) * 0.25;
    const journeyState = b[5] + (c[5] - b[5]) * u;
    const px0 = jx * w + (R ? 0 : s.pointer.x) * jr * 0.1,
      py0 = jy * h - (R ? 0 : s.pointer.y) * jr * 0.08;

    // ── Closing timeline, from the same smoothed scroll. ──
    const travel = Math.max(1, s.convHeight - innerHeight);
    const entry = clamp((S + innerHeight - s.convTop) / innerHeight);
    const t = R ? (S + innerHeight * 0.5 >= s.convTop ? 1 : 0) : clamp((S - s.convTop) / travel);
    const exit = clamp((S - s.convTop - travel) / innerHeight);
    const E = R ? (t > 0 ? 1 : 0) : ease(entry);

    // ── Camera rig: journey camera blends into the convergence path; restored on reverse scroll. ──
    closingCamera(t, w / h, tmp.cam);
    camera.position.copy(JOURNEY_CAMERA).lerp(tmp.cam, E);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const toWorld = (x: number, y: number, out: THREE.Vector3) => {
      tmp.ray
        .set((x / w) * 2 - 1, -(y / h) * 2 + 1, 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize();
      return out.copy(camera.position).addScaledVector(tmp.ray, -camera.position.z / tmp.ray.z);
    };
    const worldPerPixel = (x: number, y: number) =>
      toWorld(x, y, tmp.a).distanceTo(toWorld(x + 1, y, tmp.b));

    // ── Protagonist in screen space: journey → nucleus at centre → arc into the live “.” slot. ──
    // Black-hole beats on the pinned timeline: suction compresses the nucleus, the collapse makes it rebound.
    const suction = band(t, 0.28, 0.56),
      post = band(t, COLLAPSE_AT, 0.68);
    const impact = R
      ? 0
      : band(t, COLLAPSE_AT - 0.02, COLLAPSE_AT + 0.005) *
        (1 - band(t, COLLAPSE_AT + 0.01, COLLAPSE_AT + 0.12));
    const compress = R ? 1 : 1 - 0.16 * suction * (1 - post) + 0.07 * impact;
    const cx = w / 2,
      cy = h / 2,
      coreR = (CORE_WORLD_RADIUS * compress) / worldPerPixel(cx, cy);
    // The "." slot only matters once the pinned closing has started (t > 0); before that no
    // layout read is needed.
    const rect = t > 0 ? targetRef.current?.getBoundingClientRect() : undefined;
    const dot =
      rect && rect.width > 0
        ? Object.assign(s.dot, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            r: rect.width * 0.52,
          })
        : null;
    const D = R ? (t >= 1 ? 1 : 0) : band(t, PHASE.dock[0], PHASE.dock[1]);
    let qx = cx,
      qy = cy,
      qr = coreR;
    if (dot && D > 0) {
      // The arc dips under the “PONTO” baseline and rises into the slot, so the nucleus never
      // crosses the letter strokes (the canvas stays under the typography, as in the original).
      const below = Math.max(dot.y, cy) + Math.max(coreR * 1.1, (dot.y - cy) * 1.0);
      qx = cubic(cx, cx + (dot.x - cx) * 0.15, dot.x + (dot.x - cx) * 0.08, dot.x, D);
      qy = cubic(cy, below + coreR * 0.35, below, dot.y, D);
      qr = lerp(coreR, dot.r, 1 - (1 - D) * (1 - D));
      if (D >= 1) {
        qx = dot.x;
        qy = dot.y;
        qr = dot.r;
      }
    }
    const sx = lerp(px0, qx, E),
      sy = lerp(py0, qy, E),
      sr = lerp(jr, qr, E);
    toWorld(sx, sy, anchor.position);
    anchor.scale.setScalar(sr * worldPerPixel(sx, sy));

    // ── Living relief: amber light follows the nucleus (page space), leaving a fading trail. ──
    const relief = shared.relief;
    if (relief) {
      // Real elapsed time (not the 0.1 s clamp) so the trail fades in seconds even on slow devices.
      const dt = Math.min(delta, 1),
        tx = sx,
        ty = sy + scrollY;
      const light = (s.light ??= { x: tx, y: ty }),
        follow = R ? 1 : 1 - Math.pow(1 - 0.16, dt * 60);
      light.x += (tx - light.x) * follow;
      light.y += (ty - light.y) * follow;
      const lightR = THREE.MathUtils.clamp(sr * 2.4, mobile ? 100 : 150, mobile ? 320 : 560);
      shared.trail.update(light.x, light.y, lightR, dt, R);
      shared.trail.write(relief);
      relief.uLive.value.set(light.x, light.y, lightR, 1);
      relief.uScroll.value = scrollY;
      relief.uRes.value.set(w, h);
      relief.uDpr.value = frame.viewport.dpr;
      relief.uPulse.value = R ? 1 : 1 + 0.06 * Math.sin(frame.clock.elapsedTime * 0.9);
      if (perfEnabled())
        (window as Window & { __ppRelief?: unknown }).__ppRelief = {
          dpr: relief.uDpr.value,
          res: relief.uRes.value.toArray(),
          scroll: relief.uScroll.value,
          live: relief.uLive.value.toArray(),
          count: relief.uCount.value,
          trail: shared.trail.points.map((q) => q.toArray()),
        };
      // The relief stays alive through the closing (no dead plane); a short cool pulse marks the collapse.
      relief.uIntensity.value =
        (1 - 0.25 * (R ? E : band(entry, 0.25, 1))) *
        (1 - 0.45 * D) *
        (mobile ? 0.75 : 1) *
        (1 + 1.6 * impact);
    }

    // ── Material: one unwrapped slot value (Morph is cyclic). Tinta = multiples of 5. ──
    const docked = !!dot && D >= 1;
    if (docked) {
      if (s.dockedAt === null) {
        s.dockedAt = frame.clock.elapsedTime;
        s.dockBase = Math.round(s.slot / 5) * 5;
      }
      const elapsed = R ? 0 : (frame.clock.elapsedTime - s.dockedAt) / SLOT_SECONDS,
        whole = Math.floor(elapsed);
      s.slot = s.dockBase + whole + band(elapsed - whole, 0.62, 1); // hold, then a smooth hand-off
    } else {
      s.dockedAt = null;
      const target =
        E > 0.001
          ? Math.round(s.slot / 5) * 5
          : journeyState + 5 * Math.round((s.slot - journeyState) / 5);
      s.slot += (target - s.slot) * (R ? 1 : lerp(0.0075, 0.1, E));
    }
    shared.material.current = s.slot / 5;

    // ── Presence in the environment: aura / plasma beams, emitted light, cool fill, light leaking onto cards. ──
    const pres = materialPresence(shared.material.current, s.presence),
      closingFade = band(entry, 0.4, 1),
      worldR = anchor.scale.x;
    shared.aura.uGlow.value = pres.glow * (1 - 0.75 * closingFade);
    shared.aura.uRays.value = pres.rays * (1 - 0.5 * closingFade);
    shared.aura.uColor.value.copy(pres.color);
    if (!R) shared.aura.uTime.value = frame.clock.elapsedTime;
    if (shared.emit.current) {
      shared.emit.current.position.copy(anchor.position);
      shared.emit.current.color.setRGB(
        pres.color.x,
        pres.color.y,
        pres.color.z,
        THREE.SRGBColorSpace,
      );
      shared.emit.current.intensity = 70 * worldR * worldR * pres.emit;
    }
    if (shared.fill.current) {
      shared.fill.current.position.set(
        anchor.position.x - 1.7 * worldR,
        anchor.position.y + 1.2 * worldR,
        anchor.position.z + 1.6 * worldR,
      );
      shared.fill.current.intensity = 16 * worldR * worldR * (1 - 0.6 * closingFade);
    }
    const { panels } = dom.current;
    if (panels?.length && s.panelBoxes.length === panels.length) {
      const y = scrollY,
        near = s.sysBottom - y > -h * 0.3 && s.sysTop - y < h * 1.3;
      if (near) {
        s.panelBoxes.forEach((box, i) => {
          const r = s.panelRects[i]!;
          r.left = box.left;
          r.right = box.left + box.width;
          r.top = box.top - y;
          r.bottom = box.top - y + box.height;
        });
        s.panelLight.update(panels, s.panelRects, sx, sy, sr, pres, R ? 0.6 : 1 - E);
      }
    }
    shared.ornament.current = 1 - band(t, PHASE.ornament[0], PHASE.ornament[1]);
    shared.closing.current = t;
    shared.reveal.current = R ? 0 : band(t, PHASE.reveal[0], PHASE.reveal[1]) * (t > 0 ? 1 : 0);

    // ── Closing world presence: fades with entry, never toggles. ──
    const world = R ? E : band(entry, 0.25, 1);
    const presence = band(entry, 0.4, 1);
    // Additive layers with zero glow add nothing to the image: skip drawing them (the whole journey).
    if (shared.rim.current) {
      const glow =
        presence * (0.52 + 0.6 * suction * (1 - post) + 1.2 * impact + band(t, 0.68, 0.84) * 0.2);
      shared.rim.current.uniforms["uGlow"]!.value = glow;
      shared.rim.current.visible = glow > 0;
    }
    if (shared.corona.current) {
      const glow = presence * (0.2 + 0.75 * suction * (1 - post) + 1.8 * impact);
      shared.corona.current.uniforms["uGlow"]!.value = glow;
      shared.corona.current.visible = glow > 0;
    }
    shared.lights.current?.forEach((light, i) => {
      if (light) light.intensity = JOURNEY_LIGHTS[i]! + CLOSING_LIGHTS[i]! * world;
    });

    // ── Signature DOM, driven by the same timeline. ──
    const materialName = MATS[((Math.round(s.slot) % 5) + 5) % 5]!;
    const { mark, tag, cap, mat } = dom.current;
    // The wordmark appears only once the nucleus has dropped below the “PONTO” baseline, so the
    // nucleus is never seen behind (or over) the letters.
    mark?.classList.toggle("show", D >= PHASE.markAtDock);
    tag?.classList.toggle("show", docked && t >= PHASE.slogan);
    if (cap) cap.style.opacity = t >= PHASE.dock[1] ? "0" : "1";
    if (mat) {
      mat.classList.toggle("show", docked && t >= PHASE.slogan);
      const text = `Agora: ${materialName}`;
      if (mat.textContent !== text) mat.textContent = text;
    }

    const stage = (s.stage ??= {
      scroll: 0,
      entry: 0,
      t: 0,
      exit: 0,
      dock: 0,
      docked: false,
      core: { x: 0, y: 0, r: 0 },
      dot: null,
      material: 0,
      materialName: "",
      reduced: false,
    });
    stage.scroll = S;
    stage.entry = entry;
    stage.t = t;
    stage.exit = exit;
    stage.dock = D;
    stage.docked = docked;
    stage.core.x = sx;
    stage.core.y = sy;
    stage.core.r = sr;
    stage.dot = dot;
    stage.material = s.slot;
    stage.materialName = materialName;
    stage.reduced = R;
    (window as Window & { __ppStage?: Stage }).__ppStage = stage;
    const perf = (window as Window & { __ppPerf?: { directorMs: number[] } }).__ppPerf;
    if (perf) perf.directorMs.push(performance.now() - perfStart);
  }, -1);
  return null;
}

const CORONA_VERT =
  "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const CORONA_FRAG =
  "uniform float uGlow; varying vec2 vUv; void main(){ vec2 p = (vUv - .5) * 5.6; float d = length(p); float a = atan(p.y, p.x); float edge = exp(-pow((d - 1.0) / .07, 2.0)); float halo = exp(-max(d - 1.0, 0.0) * 2.6) * step(1.0, d); float rays = .75 + .25 * sin(a * 23.0) * sin(a * 7.0 + 1.3); float i = (edge * 1.1 + halo * .55 * rays) * uGlow * smoothstep(2.8, 2.2, d); gl_FragColor = vec4(vec3(1.0, .5, .16) * i, i); }";
const RIM_VERT =
  "varying vec3 n;varying vec3 v;void main(){vec4 q=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-q.xyz);gl_Position=projectionMatrix*q;}";
const RIM_FRAG =
  "uniform float uGlow;varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(n,v)),3.4);gl_FragColor=vec4(vec3(1.,.19,.025)*f*uGlow,f*uGlow);}";

function JourneyScene({
  root,
  targetRef,
  reduced,
}: {
  root: RefObject<HTMLElement | null>;
  targetRef: RefObject<HTMLSpanElement | null>;
  reduced: MutableRefObject<boolean>;
}) {
  const aura = useAura();
  const shared: Shared = {
    anchor: useRef<THREE.Group>(null),
    rim: useRef<THREE.ShaderMaterial>(null),
    corona: useRef<THREE.ShaderMaterial>(null),
    aura: aura.uniforms,
    emit: useRef<THREE.PointLight>(null),
    fill: useRef<THREE.PointLight>(null),
    lights: useRef<(THREE.Light | null)[]>([]),
    material: useRef(0),
    ornament: useRef(1),
    closing: useRef(0),
    reveal: useRef(0),
    relief: useReliefUniforms(),
    trail: useMemo(() => new ReliefTrail(), []),
  };
  const reliefOn = useMemo(
    () =>
      typeof window === "undefined" || new URLSearchParams(location.search).get("fundo") !== "0",
    [],
  );
  if (!reliefOn) shared.relief = null;
  else if (
    typeof window !== "undefined" &&
    new URLSearchParams(location.search).get("fundo")?.startsWith("debug")
  )
    shared.relief!.uDebug.value =
      new URLSearchParams(location.search).get("fundo") === "debug2" ? 2 : 1; // shows light energy / lambert / curvature
  const rimUniforms = useMemo(() => ({ uGlow: { value: 0 } }), []);
  const coronaUniforms = useMemo(() => ({ uGlow: { value: 0 } }), []);
  const relief = useMemo(() => getReliefTextures(), []);
  const setLight = (i: number) => (light: THREE.Light | null) => {
    shared.lights.current![i] = light;
  };
  return (
    <>
      <Director root={root} targetRef={targetRef} reduced={reduced} shared={shared} />
      <ShaderWarmup />
      <QualityGovernor trail={shared.trail} />
      {perfEnabled() && <PerfProbe />}
      {reliefOn && shared.relief && <ReliefBackground uniforms={shared.relief} />}
      <ambientLight intensity={0.05} />
      {/* Journey key/rim spots; the Director adds the closing rig's share to them (same lights). */}
      <spotLight
        ref={setLight(0)}
        position={[3, 6, 2]}
        angle={0.4}
        penumbra={1}
        intensity={JOURNEY_LIGHTS[0]}
        color="#fff4e8"
      />
      <spotLight
        ref={setLight(1)}
        position={[-4, 3, -3]}
        angle={0.5}
        penumbra={1}
        intensity={JOURNEY_LIGHTS[1]}
        color="#9fb4ff"
      />
      {/* Closing light rig (previously inside the convergence scene), faded in by the Director. */}
      <pointLight
        ref={setLight(2)}
        position={[0.4, -0.1, 2]}
        intensity={0}
        distance={4.7}
        color="#ff571d"
      />
      {/* Light the sphere emits onto nearby blocks/fragments, and a cool fill echoing the relief light. */}
      <pointLight ref={shared.emit} intensity={0} decay={2} />
      <pointLight ref={shared.fill} intensity={0} decay={2} color="#57c9d7" />
      <Environment resolution={256} frames={1}>
        {/* The mineral relief and a cool band live in the reflections, so the sphere mirrors its surroundings. */}
        <mesh scale={30}>
          <sphereGeometry args={[1, 64, 32]} />
          <meshBasicMaterial map={relief.albedo} side={THREE.BackSide} toneMapped={false} />
        </mesh>
        <Lightformer
          intensity={0.7}
          color="#57c9d7"
          position={[-4.5, -1.2, 3]}
          scale={[7, 1.4, 1]}
          rotation-y={Math.PI / 3}
        />
        <Lightformer
          intensity={3}
          position={[0, 5, -2]}
          scale={[8, 2, 1]}
          rotation-x={Math.PI / 2}
        />
        <Lightformer
          intensity={2}
          position={[-5, 1.5, 0]}
          rotation-y={Math.PI / 2}
          scale={[10, 0.4, 1]}
        />
        <Lightformer
          intensity={1.5}
          color="#ffd9b0"
          position={[5, 1, 1]}
          rotation-y={-Math.PI / 2}
          scale={[10, 0.6, 1]}
        />
        <Lightformer intensity={0.8} color="#b8c8ff" position={[0, 1, 6]} scale={[6, 1, 1]} />
        <Lightformer
          form="ring"
          intensity={0.6}
          position={[0, -3, 0]}
          rotation-x={-Math.PI / 2}
          scale={6}
        />
        <Lightformer intensity={0.25} position={[0, 2, -8]} scale={[20, 8, 1]} />
      </Environment>
      {/* The one protagonist: same Morph instance from the hero to the final “.”. */}
      <group ref={shared.anchor}>
        <group position={[0, -1.15, 0]}>
          <Morph progress={shared.material} cyclic ornament={shared.ornament} />
        </group>
        <Aura material={aura.material} />
        {/* Event-horizon corona: thin hot edge + soft outer glow; faces the camera (which looks at the origin). */}
        <mesh>
          <planeGeometry args={[5.6, 5.6]} />
          <shaderMaterial
            ref={shared.corona}
            uniforms={coronaUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            vertexShader={CORONA_VERT}
            fragmentShader={CORONA_FRAG}
          />
        </mesh>
        <mesh scale={1.012}>
          <sphereGeometry args={[1, seg(72), seg(72)]} />
          <shaderMaterial
            ref={shared.rim}
            uniforms={rimUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            vertexShader={RIM_VERT}
            fragmentShader={RIM_FRAG}
          />
        </mesh>
      </group>
      <ConvergenceField progress={shared.closing} reveal={shared.reveal} />
    </>
  );
}

export function SiteV2Webgl({
  root,
  targetRef,
}: {
  root: RefObject<HTMLElement | null>;
  targetRef: RefObject<HTMLSpanElement | null>;
}) {
  const reduced = useRef(
    typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const gl = useMemo(
    () => ({ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }),
    [],
  );
  // The relief pixels are generated in a worker; the canvas starts once they exist, so the
  // environment map (rendered once) still reflects the relief.
  const [reliefReady, setReliefReady] = useState(false);
  useEffect(() => {
    let alive = true;
    reliefPixels.then(() => alive && setReliefReady(true));
    return () => {
      alive = false;
    };
  }, []);
  if (!reliefReady) return null;
  const quality = initialQuality();
  return (
    <Canvas
      className="site-v2-webgl-world"
      dpr={Math.min(window.devicePixelRatio || 1, PROFILES[quality].dpr)}
      camera={{ position: [0, 0, 5.2], fov: 32 }}
      gl={gl}
      // The canvas is position:fixed, so scrolling never moves it: no scroll listeners needed.
      resize={{ scroll: false }}
      onCreated={({ gl: renderer }) => {
        renderer.setClearColor(0x000000, 0);
        renderer.transmissionResolutionScale = PROFILES[quality].transmission;
      }}
    >
      <JourneyScene root={root} targetRef={targetRef} reduced={reduced} />
    </Canvas>
  );
}

export default SiteV2Webgl;
