import { useEffect, useRef } from "react";
import styles from "./HeroRipple.module.css";

/* The hero photo redrawn in WebGL: under the cursor it ripples outward in rings, splits slightly into red and blue,
   and glows orange, with a fading orange trail behind the cursor. Mouse only, desktop layout only. */

const FOLLOW = 0.075; // the ripple centre eases toward the pointer: share of the distance per 60 fps frame
const RISE = 0.07; // strength easing in while the pointer is over the hero
const FALL = 0.028; // … and out after it leaves
const TRAIL = 9; // trail points, each following the one before it
const TRAIL_FOLLOW = 0.19; // first trail point; each next one 0.009 slower
const DPR_MAX = 2.25;
const POSITION_Y = 0.3; // the photo's object-position y, so the canvas lines up with the <img>

const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D image;
uniform vec2 resolution;
uniform vec2 imageSize;
uniform vec2 mouse;
uniform vec2 trail[${TRAIL}];
uniform float strength;
uniform float time;
uniform float positionY;

vec2 coverUv(vec2 uv) {
  float rs = resolution.x / resolution.y;
  float is = imageSize.x / imageSize.y;
  vec2 scale = rs < is ? vec2(rs / is, 1.0) : vec2(1.0, is / rs);
  return uv * scale + vec2((1.0 - scale.x) * 0.5, (1.0 - scale.y) * (1.0 - positionY));
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(resolution.x / resolution.y, 1.0);
  vec2 delta = (uv - mouse) * aspect;
  float dist = length(delta);
  float falloff = smoothstep(0.47, 0.0, dist) * strength;

  vec2 dir = delta / (dist + 0.0001);
  vec2 tangent = vec2(-dir.y, dir.x);
  float wave = sin(dist * 38.0 - time * 2.15) * falloff;
  float secondary = sin(dist * 19.0 + time * 0.7) * falloff;
  vec2 displacement = dir * (wave * 0.00525 + falloff * 0.004) + tangent * secondary * 0.001875;

  vec2 sampleUv = coverUv(uv + displacement);
  vec2 rgbShift = dir * (falloff * 0.0016 + abs(wave) * 0.0012);
  vec3 color = vec3(
    texture2D(image, sampleUv + rgbShift).r,
    texture2D(image, sampleUv).g,
    texture2D(image, sampleUv - rgbShift).b
  );

  float glow = falloff * (0.10 + 0.08 * (sin(dist * 28.0 - time * 1.5) * 0.5 + 0.5));
  float trailGlow = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    float d = length((uv - trail[i]) * aspect);
    float age = 1.0 - float(i) / ${TRAIL}.0;
    float halo = exp(-d * d * 145.0);
    float core = exp(-d * d * 420.0);
    float shimmer = 0.82 + 0.18 * sin(time * 2.0 - float(i) * 0.72);
    trailGlow += (halo * 0.48 + core * 0.28) * age * age * shimmer;
  }
  trailGlow = min(trailGlow, 1.35) * strength * smoothstep(0.035, 0.105, dist);

  color += vec3(0.85, 0.30, 0.16) * glow;
  color += vec3(0.85, 0.36, 0.20) * trailGlow * 0.46;
  color += vec3(0.95, 0.60, 0.42) * pow(trailGlow, 1.65) * 0.11;
  gl_FragColor = vec4(color, 1.0);
}`;

type Props = {
  image: HTMLImageElement | null; // the decoded hero photo
  onReady: (ok: boolean) => void; // false: no WebGL, the page keeps the plain photo
};

export function HeroRipple({ image, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const hero = host?.closest("section");
    if (!host || !hero || !image) return;
    if (!window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) return;

    // The canvas is made here, not in JSX: StrictMode's second mount must not inherit the first one's context
    const canvas = document.createElement("canvas");
    canvas.className = styles.canvas;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) {
      onReady(false);
      return;
    }
    host.appendChild(canvas);

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      host.removeChild(canvas);
      onReady(false);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } catch (error) {
      // A cross-origin photo without CORS can't be read: keep the plain photo
      console.error(error);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      onReady(false);
      return;
    }

    const loc = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      resolution: loc("resolution"),
      imageSize: loc("imageSize"),
      mouse: loc("mouse"),
      trail: loc("trail[0]"),
      strength: loc("strength"),
      time: loc("time"),
      positionY: loc("positionY"),
    };
    gl.uniform2f(u.imageSize, image.naturalWidth, image.naturalHeight);
    gl.uniform1f(u.positionY, POSITION_Y);

    const target = { x: 0.5, y: 0.5, strength: 0 };
    const current = { x: 0.5, y: 0.5, strength: 0 };
    const trail = new Float32Array(TRAIL * 2).fill(0.5);
    let raf = 0;
    let last = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
      canvas.width = Math.max(1, Math.round(canvas.offsetWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.offsetHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      request();
    };

    const draw = (now: number) => {
      raf = 0;
      if (canvas.width < 2 || canvas.height < 2) return;
      const dt = last ? Math.min(64, now - last) : 16.667;
      last = now;
      const k = (share: number) => 1 - Math.pow(1 - share, dt / 16.667);
      current.x += (target.x - current.x) * k(FOLLOW);
      current.y += (target.y - current.y) * k(FOLLOW);
      current.strength += (target.strength - current.strength) * k(target.strength ? RISE : FALL);
      let leaderX = current.x;
      let leaderY = current.y;
      for (let i = 0; i < TRAIL; i++) {
        const f = k(TRAIL_FOLLOW - i * 0.009);
        trail[i * 2] += (leaderX - trail[i * 2]) * f;
        trail[i * 2 + 1] += (leaderY - trail[i * 2 + 1]) * f;
        leaderX = trail[i * 2];
        leaderY = trail[i * 2 + 1];
      }
      gl.uniform2f(u.resolution, canvas.width, canvas.height);
      gl.uniform2f(u.mouse, current.x, current.y);
      gl.uniform2fv(u.trail, trail);
      gl.uniform1f(u.strength, current.strength);
      gl.uniform1f(u.time, now * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      canvas.dataset.drawn = ""; // fades the canvas in over the <img> (it's black until its first frame)
      // Keep animating while there is a ripple to show; at rest the canvas holds the plain photo
      if (visible && (target.strength > 0 || current.strength > 0.001)) raf = requestAnimationFrame(draw);
      else last = 0;
    };
    function request() {
      if (!raf) raf = requestAnimationFrame(draw);
    }

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !visible) return;
      const rect = canvas.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = 1 - (event.clientY - rect.top) / rect.height;
      target.strength = 1;
      request();
    };
    const leave = () => {
      target.strength = 0;
      request();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) request();
    });
    observer.observe(hero);
    const sizes = new ResizeObserver(resize);
    sizes.observe(canvas);
    window.addEventListener("pointermove", move);
    document.documentElement.addEventListener("pointerleave", leave);
    resize();
    onReady(true);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      sizes.disconnect();
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      gl.deleteProgram(program);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [image, onReady]);

  return <div ref={hostRef} className={styles.host} aria-hidden="true" />;
}
