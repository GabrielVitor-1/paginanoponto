import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { stateWeight } from "./states";

const R = 1;
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){float f=0.,a=.5;for(int i=0;i<5;i++){f+=a*snoise(p);p*=2.02;a*=.5;}return f;}
`;

export const plasmaVert =
  NOISE +
  /* glsl */ `
uniform float uTime; varying vec3 vPos; varying vec3 vN; varying vec3 vView;
void main(){
  vec3 p=position; float d=fbm(normal*1.6+vec3(0.,-uTime*.35,uTime*.2));
  p+=normal*d*.07;
  vec4 wp=modelMatrix*vec4(p,1.); vPos=position; vN=normalize(normalMatrix*normal);
  vView=normalize(-(viewMatrix*wp).xyz); gl_Position=projectionMatrix*viewMatrix*wp;
}`;
export const plasmaFrag =
  NOISE +
  /* glsl */ `
uniform float uTime; uniform float uOpacity; varying vec3 vPos; varying vec3 vN; varying vec3 vView;
vec3 ramp(float t){
  vec3 c=mix(vec3(.05,.0,.0),vec3(.55,.04,.01),smoothstep(.0,.35,t));
  c=mix(c,vec3(1.,.32,.04),smoothstep(.3,.6,t));
  c=mix(c,vec3(1.,.72,.25),smoothstep(.6,.85,t));
  return mix(c,vec3(1.,.95,.8),smoothstep(.88,1.,t));
}
void main(){
  vec3 q=vPos*2.2; float t=uTime*.25;
  vec3 warp=vec3(fbm(q+vec3(0.,t,0.)),fbm(q+vec3(5.2,-t,1.3)),fbm(q+vec3(1.7,9.2,t)));
  float n=fbm(q*1.3+warp*1.8+vec3(0.,-t*2.,0.));
  float cells=1.-abs(snoise(q*2.5+warp*2.+t));
  float fres=pow(1.-max(dot(vN,vView),0.),2.2);
  float heat=clamp(.42+n*.75+cells*.18-fres*.25,0.,1.);
  vec3 col=ramp(heat*.92)*1.35 + vec3(1.,.35,.05)*fres*1.6;
  gl_FragColor=vec4(col,uOpacity);
}`;

const haloFrag = /* glsl */ `
uniform float uOpacity; varying vec3 vN; varying vec3 vView;
void main(){ float f=pow(1.-abs(dot(vN,vView)),3.); gl_FragColor=vec4(vec3(1.,.3,.05)*f*1.5,f*uOpacity); }`;
const haloVert = /* glsl */ `
varying vec3 vN; varying vec3 vView;
void main(){ vec4 wp=modelMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vView=normalize(-(viewMatrix*wp).xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`;

const VOX = 0.075;
type Vox = { pos: THREE.Vector3; n: THREE.Vector3; seed: number; ext: number };

/** Circular version used only by the docked signature: 4 → 0 stays a soft hand-off. */
export function cyclicMaterialWeight(progress: number, index: number) {
  const x = (((progress % 1) + 1) % 1) * 5;
  const distance = Math.abs(x - index);
  const wrapped = Math.min(distance, 5 - distance);
  const weight = Math.max(0, 1 - wrapped);
  return weight * weight * (3 - 2 * weight);
}

/** Keeps the original instanced shell, adding only a mineral finish per face. */
function createBasaltMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: "#202025",
    metalness: 0.045,
    roughness: 0.88,
    envMapIntensity: 0.34,
    vertexColors: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vMineralWorld; varying vec3 vMineralLocal;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvMineralLocal = position; vMineralWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vMineralWorld; varying vec3 vMineralLocal;
float mineralHash(vec3 p){ return fract(sin(dot(p, vec3(17.23, 91.17, 41.61))) * 43758.5453); }
float mineralNoise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(mineralHash(i), mineralHash(i+vec3(1.,0.,0.)), f.x), mix(mineralHash(i+vec3(0.,1.,0.)), mineralHash(i+vec3(1.,1.,0.)), f.x), f.y), mix(mix(mineralHash(i+vec3(0.,0.,1.)), mineralHash(i+vec3(1.,0.,1.)), f.x), mix(mineralHash(i+vec3(0.,1.,1.)), mineralHash(i+vec3(1.,1.,1.)), f.x), f.y), f.z);
}
float mineralFbm(vec3 p){ float s=0., a=.55; for(int i=0;i<3;i++){ s+=a*mineralNoise(p); p=p*2.13+vec3(5.1,1.7,9.2); a*=.5; } return s; }`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
float mineral = mineralFbm(vMineralWorld * 18.0);
float grain = mineralFbm(vMineralWorld * 62.0);
float edge = smoothstep(0.33, 0.5, max(max(abs(vMineralLocal.x), abs(vMineralLocal.y)), abs(vMineralLocal.z)));
diffuseColor.rgb *= mix(0.58, 1.18, mineral);
diffuseColor.rgb *= mix(0.84, 1.06, grain);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.18, 1.09, 0.92), edge * 0.22);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + mineral * 0.09 + grain * 0.07 + edge * 0.08, 0.68, 1.0);`,
      );
  };
  material.customProgramCacheKey = () => "pagina-ponto-basalt-v2";
  return material;
}
/** Voxelised spherical shell: grid-aligned cubes, a few extruded, some holes revealing glowing cells beneath. */
function useVoxels() {
  return useMemo(() => {
    const shell: Vox[] = [];
    const glow: Vox[] = [];
    const N = Math.ceil(R / VOX) + 1;
    let k = 0;
    const rnd = () => {
      k++;
      const x = Math.sin(k * 12.9898 + 4.1) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let x = -N; x <= N; x++)
      for (let y = -N; y <= N; y++)
        for (let z = -N; z <= N; z++) {
          const p = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5).multiplyScalar(VOX);
          const d = p.length();
          if (d > R || d <= R - VOX * 1.25) continue;
          const ax = Math.abs(p.x),
            ay = Math.abs(p.y),
            az = Math.abs(p.z);
          const n =
            ax >= ay && ax >= az
              ? new THREE.Vector3(Math.sign(p.x), 0, 0)
              : ay >= az
                ? new THREE.Vector3(0, Math.sign(p.y), 0)
                : new THREE.Vector3(0, 0, Math.sign(p.z));
          const seed = rnd();
          const r2 = rnd();
          if (seed > 0.955) {
            glow.push({ pos: p.clone().addScaledVector(n, -VOX * 0.55), n, seed: r2, ext: 0 });
            continue;
          }
          const ext = r2 > 0.8 ? VOX * (0.25 + rnd() * 0.55) : r2 < 0.12 ? -VOX * 0.3 : 0;
          shell.push({ pos: p, n, seed: r2, ext });
        }
    return { shell, glow };
  }, []);
}

export function Morph({
  progress,
  cyclic = false,
  signature = false,
  ornament,
}: {
  progress: React.MutableRefObject<number>;
  cyclic?: boolean;
  signature?: boolean;
  /** 0..1: fades the ink ring / mercury drops / bob (closing signature). */ ornament?: React.MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const ink = useRef<THREE.Mesh>(null);
  const glass = useRef<THREE.Mesh>(null);
  const merc = useRef<THREE.Mesh>(null);
  const plasma = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const tilesMesh = useRef<THREE.InstancedMesh>(null);
  const accentMesh = useRef<THREE.InstancedMesh>(null);
  const shown = useRef(0);
  const ring = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.Group>(null);
  const basaltMaterial = useMemo(() => createBasaltMaterial(), []);

  const grain = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    const img = g.createImageData(512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.random() * 60 + (Math.random() > 0.995 ? 70 : 0);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return t;
  }, []);
  const { shell: tiles, glow: accents } = useVoxels();
  const tileColors = useMemo(
    () =>
      tiles.map((tile) => {
        const shade = 0.095 + tile.seed * 0.11 + (tile.ext < 0 ? -0.018 : 0);
        return new THREE.Color().setHSL(0.66 + tile.seed * 0.018, 0.07 + tile.seed * 0.06, shade);
      }),
    [tiles],
  );
  const accentColors = useMemo(
    () =>
      accents.map((accent) =>
        new THREE.Color().setHSL(0.095 + accent.seed * 0.025, 0.92, 0.36 + accent.seed * 0.16),
      ),
    [accents],
  );
  const plasmaU = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 } }), []);
  const haloU = useMemo(() => ({ uOpacity: { value: 0 } }), []);
  const tmp = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (tilesMesh.current) {
      tileColors.forEach((color, index) => tilesMesh.current?.setColorAt(index, color));
      if (tilesMesh.current.instanceColor) tilesMesh.current.instanceColor.needsUpdate = true;
    }
    if (accentMesh.current) {
      accentColors.forEach((color, index) => accentMesh.current?.setColorAt(index, color));
      if (accentMesh.current.instanceColor) accentMesh.current.instanceColor.needsUpdate = true;
    }
    return () => basaltMaterial.dispose();
  }, [accentColors, basaltMaterial, tileColors]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    shown.current += (progress.current - shown.current) * (1 - Math.exp(-6 * dt));
    const p = shown.current;
    const t = state.clock.elapsedTime;
    const [w0, w1, w2, w3, w4] = [0, 1, 2, 3, 4].map((i) =>
      cyclic ? cyclicMaterialWeight(p, i) : stateWeight(p, i),
    ) as [number, number, number, number, number];
    const w = [w0, w1, w2, w3, w4] as const;
    const orn = ornament ? THREE.MathUtils.clamp(ornament.current, 0, 1) : signature ? 0 : 1;

    if (group.current) {
      group.current.position.y = signature ? 1.15 : 1.15 + Math.sin(t * 0.8) * 0.03 * orn;
      group.current.rotation.y = signature ? 0 : t * 0.12;
    }
    const breathe = 1 + Math.sin(t * 1.3) * 0.006;
    const setLayer = (m: THREE.Mesh | null, wt: number, s = 1) => {
      if (!m) return;
      m.visible = wt > 0.002;
      m.scale.setScalar((0.94 + 0.06 * wt) * s * breathe);
      const mat = m.material as THREE.Material & { opacity: number };
      mat.opacity = wt;
    };
    setLayer(ink.current, w[0]);
    setLayer(glass.current, w[1], 1.001);
    if (glass.current) (glass.current.material as THREE.MeshPhysicalMaterial).transmission = w[1];
    setLayer(merc.current, w[2], 1.002);
    setLayer(plasma.current, w[3]);
    if (plasma.current) {
      const u = (plasma.current.material as THREE.ShaderMaterial).uniforms;
      u["uTime"]!.value = t;
      u["uOpacity"]!.value = w[3];
    }
    if (halo.current)
      (halo.current.material as THREE.ShaderMaterial).uniforms["uOpacity"]!.value = w[3];
    if (plasma.current) plasma.current.visible = w[3] > 0.002;
    if (halo.current) {
      halo.current.visible = w[3] > 0.002;
      halo.current.scale.setScalar(1.07 + Math.sin(t * 2) * 0.008);
    }

    // Module: tiles assemble on the surface, then drift slightly outward.
    const wm = w[4];
    if (ring.current) {
      ring.current.visible = orn > 0.002 && w[0] > 0.002;
      (ring.current.material as THREE.MeshStandardMaterial).opacity = w[0] * orn;
      ring.current.rotation.z = 0.35 + Math.sin(t * 0.3) * 0.03;
      ring.current.scale.setScalar(0.9 + 0.1 * w[0]);
    }
    if (drops.current) {
      drops.current.visible = orn > 0.002 && w[2] > 0.002;
      drops.current.children.forEach((c, i) => {
        const a = t * (0.45 + i * 0.08) + i * 1.3;
        const r = 1.35 + i * 0.12 + (1 - w[2]) * -0.4;
        c.position.set(Math.cos(a) * r, Math.sin(a * 1.3 + i) * 0.35, Math.sin(a) * r);
        c.scale.setScalar((0.05 + (i % 3) * 0.03) * w[2] * orn);
      });
    }
    if (core.current) {
      core.current.visible = wm > 0.002;
      (core.current.material as THREE.MeshStandardMaterial).opacity = wm;
    }
    const place = (mesh: THREE.InstancedMesh | null, list: Vox[], size: number, live: boolean) => {
      if (!mesh) return;
      mesh.visible = wm > 0.002;
      list.forEach((v, i) => {
        const local = THREE.MathUtils.clamp(wm * 1.7 - v.seed * 0.7, 0, 1);
        const breath = live ? Math.max(0, Math.sin(t * 0.6 + v.seed * 40)) ** 6 * VOX * 0.5 : 0;
        const out = v.ext + breath + (1 - local) * 0.35;
        tmp.position
          .copy(v.pos)
          .addScaledVector(v.n, out)
          .addScaledVector(v.pos, (1 - local) * 0.25);
        tmp.quaternion.identity();
        tmp.scale.setScalar(VOX * size * (0.4 + 0.6 * local));
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(tilesMesh.current, tiles, 0.93, true);
    place(accentMesh.current, accents, 0.9, false);
  });

  return (
    <group ref={group}>
      <mesh ref={ring} rotation-x={Math.PI / 2.25}>
        <torusGeometry args={[1.45, 0.006, 16, 256]} />
        <meshStandardMaterial
          color="#000"
          emissive="#e0a95a"
          emissiveIntensity={2.4}
          toneMapped={false}
          transparent
        />
      </mesh>
      <group ref={drops}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 48, 48]} />
            <meshStandardMaterial
              color="#f4f6f8"
              metalness={1}
              roughness={0.03}
              envMapIntensity={3}
            />
          </mesh>
        ))}
      </group>
      {/* 1 · Tinta */}
      <mesh ref={ink} castShadow>
        <sphereGeometry args={[R, 128, 128]} />
        <meshPhysicalMaterial
          color="#060606"
          roughness={0.55}
          metalness={0.05}
          envMapIntensity={0.55}
          bumpMap={grain}
          bumpScale={0.25}
          clearcoat={0.35}
          clearcoatRoughness={0.45}
          sheen={0.5}
          sheenRoughness={0.5}
          sheenColor="#5a4630"
          transparent
        />
      </mesh>
      {/* 2 · Vidro */}
      <mesh ref={glass}>
        <sphereGeometry args={[R, 128, 128]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.0}
          metalness={0}
          transmission={1}
          thickness={2.2}
          ior={1.45}
          specularIntensity={1}
          specularColor="#ffffff"
          iridescence={1}
          iridescenceIOR={1.6}
          iridescenceThicknessMinimum={100}
          iridescenceThicknessMaximum={800}
          dispersion={4}
          clearcoat={1}
          envMapIntensity={1.4}
          attenuationColor="#cfe6ff"
          attenuationDistance={4}
          transparent
        />
      </mesh>
      {/* 3 · Mercúrio */}
      <mesh ref={merc}>
        <sphereGeometry args={[R, 192, 192]} />
        <MeshDistortMaterial
          color="#f4f6f8"
          metalness={1}
          roughness={0.02}
          distort={0.22}
          speed={0.9}
          envMapIntensity={3.2}
          transparent
        />
      </mesh>
      {/* 4 · Plasma */}
      <mesh ref={plasma}>
        <sphereGeometry args={[R, 160, 160]} />
        <shaderMaterial
          vertexShader={plasmaVert}
          fragmentShader={plasmaFrag}
          uniforms={plasmaU}
          transparent
          toneMapped={false}
        />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[R, 64, 64]} />
        <shaderMaterial
          vertexShader={haloVert}
          fragmentShader={haloFrag}
          uniforms={haloU}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      {/* 5 · Módulo */}
      <mesh ref={core}>
        <sphereGeometry args={[R * 0.86, 64, 64]} />
        <meshStandardMaterial color="#020203" roughness={1} transparent />
      </mesh>
      <instancedMesh ref={tilesMesh} args={[undefined, undefined, tiles.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <primitive attach="material" object={basaltMaterial} />
      </instancedMesh>
      <instancedMesh ref={accentMesh} args={[undefined, undefined, accents.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#140b02"
          emissive="#ff9d19"
          emissiveIntensity={2.25}
          roughness={0.72}
          vertexColors
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
