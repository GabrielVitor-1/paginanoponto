import { Mesh, Program, Renderer, Triangle } from "ogl";

const vertex = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float breath = .5 + .5 * sin(uTime * .9);
  float glow = exp(-5.0 * distance(uv, vec2(.5, .46)));
  vec3 color = mix(uColor1, uColor2, breath);
  vec2 grid = vec2(10.0, 18.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float seed = hash(cell);
  float rise = fract(uTime * (.045 + seed * .02) + seed);
  float sparkY = 1.0 - rise;
  float sparkX = .5 + sin(uTime * .4 + seed * 20.0) * .18;
  float spark = smoothstep(.09, 0.0, distance(local, vec2(sparkX, sparkY)));
  float smoke = smoothstep(.3, 0.0, abs(sin(uv.x * 8.0 + uTime * .15) * .1 + uv.y - .55));
  float alpha = glow * (.10 + breath * .13) + spark * .55 + smoke * .035;
  vec3 ember = mix(uColor3, uColor2, seed);
  gl_FragColor = vec4(mix(color, ember, spark), alpha);
}`;

const hexToVector = (hex) => {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
};

export const createAurora = (container, { reducedMotion = false } = {}) => {
  const lowPowerDevice =
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2);
  if (reducedMotion || lowPowerDevice || !window.WebGLRenderingContext) {
    container.classList.add("hero-light-static");
    return () => container.classList.remove("hero-light-static");
  }

  let renderer;
  try {
    renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
  } catch {
    container.classList.add("hero-light-static");
    return () => container.classList.remove("hero-light-static");
  }
  const gl = renderer.gl;
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [1, 1] },
      uColor1: { value: hexToVector("#C85A2A") },
      uColor2: { value: hexToVector("#E8B54A") },
      uColor3: { value: hexToVector("#8B9184") },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  container.appendChild(gl.canvas);
  gl.canvas.style.cssText = "display:block;width:100%;height:100%;";

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, width), Math.max(1, height));
    program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    renderer.render({ scene: mesh });
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let frame = 0;
  const render = (time) => {
    program.uniforms.uTime.value = time * 0.001;
    renderer.render({ scene: mesh });
    frame = window.requestAnimationFrame(render);
  };

  if (!reducedMotion) frame = window.requestAnimationFrame(render);

  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    gl.canvas.remove();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
};
