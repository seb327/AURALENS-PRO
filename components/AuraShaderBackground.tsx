// Premium WebGL aura background — web only.
//
// Renders a full-screen fragment shader behind the app. The shader uses
// multi-octave domain-warped simplex noise, mapped through an aura colour
// palette, with mouse-following light and a soft vignette + film grain.
// Runs at 60fps on any modern GPU. Falls back to nothing on native or
// when WebGL2 isn't available.
//
// No three.js / R3F dependency — vanilla WebGL2 keeps the bundle lean.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// ─── Eager body styling (runs at module load) ───────────────────────────────
// Force the browser background to obsidian immediately — before React has
// painted anything. Without this, expo's default white body flashes through
// during the first frames (and through any transparent layer afterwards).
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const apply = () => {
    if (document.querySelector('style[data-auralens-eager]')) return;
    const s = document.createElement('style');
    s.setAttribute('data-auralens-eager', '1');
    s.textContent = `
      html, body, #root { background-color: #050507 !important; color: #F7F3EA; }
      body {
        font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
        font-feature-settings: 'cv11', 'ss01', 'kern';
      }
    `;
    (document.head || document.documentElement).appendChild(s);
  };
  apply();
}

// ─── Fragment shader ─────────────────────────────────────────────────────────
// Aura field:
//   - 4-octave fractal noise, domain-warped for organic flow
//   - colour palette interpolated through gold/violet/indigo/deep
//   - mouse pulls a bright lobe of light
//   - soft radial vignette
//   - per-pixel film grain
const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_dpr;
uniform float u_scroll;      // smoothed cumulative scroll position (pixels)
uniform float u_velocity;    // smoothed scroll/swipe velocity (-1..1)
uniform float u_energy;      // 0..1 pulse triggered by user actions

out vec4 fragColor;

// Hash & noise -----------------------------------------------------------------
vec3 hash3(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Simplex-ish gradient noise (cheap, smooth)
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);

  float n000 = dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0));
  float n100 = dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0));
  float n010 = dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0));
  float n110 = dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0));
  float n001 = dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1));
  float n101 = dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1));
  float n011 = dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1));
  float n111 = dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1));

  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

// Domain-warped FBM — gives the organic flowing aura look
float aura(vec3 p) {
  vec3 q = vec3(
    fbm(p + vec3(0.0, 0.0, 0.0)),
    fbm(p + vec3(5.2, 1.3, 0.0)),
    fbm(p + vec3(2.4, 4.7, 0.0))
  );
  vec3 r = vec3(
    fbm(p + 2.0 * q + vec3(1.7, 9.2, 0.0)),
    fbm(p + 2.0 * q + vec3(8.3, 2.8, 0.0)),
    fbm(p + 2.0 * q + vec3(3.1, 6.5, 0.0))
  );
  return fbm(p + 4.0 * r);
}

// Aura palette: deep obsidian → indigo → violet → warm gold core
vec3 palette(float t) {
  vec3 c0 = vec3(0.020, 0.020, 0.027); // near-black obsidian
  vec3 c1 = vec3(0.090, 0.060, 0.180); // deep indigo
  vec3 c2 = vec3(0.300, 0.180, 0.480); // violet
  vec3 c3 = vec3(0.720, 0.470, 0.620); // dusty rose-violet
  vec3 c4 = vec3(0.960, 0.780, 0.420); // warm gold core
  vec3 c5 = vec3(0.984, 0.890, 0.635); // gold highlight

  t = clamp(t, 0.0, 1.0);
  if (t < 0.20) return mix(c0, c1, t / 0.20);
  if (t < 0.45) return mix(c1, c2, (t - 0.20) / 0.25);
  if (t < 0.70) return mix(c2, c3, (t - 0.45) / 0.25);
  if (t < 0.90) return mix(c3, c4, (t - 0.70) / 0.20);
  return mix(c4, c5, (t - 0.90) / 0.10);
}

// Grain ------------------------------------------------------------------------
float grain(vec2 uv, float t) {
  return fract(sin(dot(uv * 1024.0, vec2(12.9898, 78.233)) + t) * 43758.5453);
}

void main() {
  vec2 res = u_resolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  vec2 mouse = (u_mouse - 0.5 * res) / min(res.x, res.y);

  // Scroll/swipe deforms UV vertically with a sheared streak — feels like
  // the aura field has inertia. velocity also accelerates time so the
  // noise visibly flows during gestures, then decays back.
  float vel = u_velocity;
  float velAbs = abs(vel);
  uv.y += vel * 0.18;
  uv.x += vel * 0.05 * sin(uv.y * 3.0 + u_time * 0.6);

  float t = u_time * 0.05 + u_scroll * 0.00015 + velAbs * 0.4;

  // Aura field
  vec3 p = vec3(uv * 1.4, t);
  float a = aura(p);
  a = 0.5 + 0.5 * a;

  // Pointer light lobe
  float md = length(uv - mouse * 0.92);
  float mouseLight = exp(-md * 2.2) * 0.30;
  a = a + mouseLight;

  // Energy pulse — bright bloom on press / phase change / result reveal
  float pulse = u_energy;
  a += pulse * (0.35 * exp(-length(uv) * 1.4));

  // Velocity-driven warmth — the aura "glows brighter" during fast motion
  a += velAbs * 0.22;

  // Vertical balance
  a *= mix(0.85, 1.05, smoothstep(-0.6, 0.4, uv.y));

  vec3 col = palette(a);

  // Vignette
  float vign = smoothstep(1.05, 0.20, length(uv));
  col *= mix(0.62, 1.0, vign);

  // Cool shadow lift
  col += vec3(0.012, 0.018, 0.040) * (1.0 - vign);

  // Film grain
  float g = grain(uv, u_time);
  col += (g - 0.5) * 0.045;

  col = pow(col, vec3(0.96));
  fragColor = vec4(col, 1.0);
}
`;

const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn('[AuraShader] compile error', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function AuraShaderBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Inject premium typography (Inter + Fraunces display) on web.
    // Done in JS so we don't need to override expo's index.html template.
    const FONT_HREF =
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap';
    if (!document.querySelector(`link[data-auralens-fonts]`)) {
      const pre1 = document.createElement('link');
      pre1.rel = 'preconnect';
      pre1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(pre1);
      const pre2 = document.createElement('link');
      pre2.rel = 'preconnect';
      pre2.href = 'https://fonts.gstatic.com';
      pre2.crossOrigin = 'anonymous';
      document.head.appendChild(pre2);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      link.setAttribute('data-auralens-fonts', '1');
      document.head.appendChild(link);
    }
    // Set body font + smooth scrolling — affects every Text via inheritance.
    if (!document.querySelector('style[data-auralens-base]')) {
      const css = document.createElement('style');
      css.setAttribute('data-auralens-base', '1');
      css.textContent = `
        html, body, #root { background: #050507; color: #F7F3EA; }
        body {
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          font-feature-settings: 'cv11', 'ss01', 'kern';
        }
        /* Make every RN <Text> inherit the premium stack on web. */
        div[dir], span, p { font-family: inherit; }
      `;
      document.head.appendChild(css);
    }

    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      // WebGL2 unavailable — degrade silently (background stays the obsidian
      // body colour from the ScreenContainer beneath).
      return;
    }

    // Respect reduced-motion preference: render one static frame instead of an
    // animation loop. The atmosphere is still there, the breathing is not.
    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      // eslint-disable-next-line no-console
      console.warn('[AuraShader] link error', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uDpr = gl.getUniformLocation(prog, 'u_dpr');
    const uScroll = gl.getUniformLocation(prog, 'u_scroll');
    const uVelocity = gl.getUniformLocation(prog, 'u_velocity');
    const uEnergy = gl.getUniformLocation(prog, 'u_energy');

    // Cap DPR at 1.5 so 2x retina screens don't burn GPU; the shader is soft
    // and noise-driven so this is visually indistinguishable.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // Pointer light — eased toward the cursor, world-space (pixels in CSS).
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = { x: mouse.x, y: mouse.y };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = window.innerHeight - e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // ── Scroll / swipe kinetic input ──────────────────────────────────────
    // We track:
    //  scrollAccum     — cumulative scroll/swipe displacement (smoothed)
    //  velocityTarget  — raw normalized velocity from the last gesture
    //  velocity        — eased follower of velocityTarget (inertia)
    //  energy          — pulse value decaying back to 0 after triggers
    let scrollAccum = 0;
    let velocityTarget = 0;
    let velocity = 0;
    let energy = 0;
    let lastTouchY = 0;
    let lastTouchT = 0;

    const onWheel = (e: WheelEvent) => {
      // Normalize deltaY to ~[-1, 1] and feed velocity target
      const norm = Math.max(-1, Math.min(1, e.deltaY / 400));
      velocityTarget += norm * 0.65;
      scrollAccum += e.deltaY;
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      lastTouchY = e.touches[0].clientY;
      lastTouchT = performance.now();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const now = performance.now();
      const dy = e.touches[0].clientY - lastTouchY;
      const dt = Math.max(8, now - lastTouchT);
      const v = Math.max(-1, Math.min(1, -dy / dt * 4));
      velocityTarget = v;
      scrollAccum += -dy;
      lastTouchY = e.touches[0].clientY;
      lastTouchT = now;
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Expose an energy-pulse trigger any screen can call (processing,
    // result reveal, button press) to bloom the aura.
    (window as any).auralensEnergyPulse = (amount = 1.0) => {
      energy = Math.min(1.4, energy + amount);
    };

    let w = 0, h = 0;
    const resize = () => {
      const nw = Math.floor(canvas.clientWidth * dpr);
      const nh = Math.floor(canvas.clientHeight * dpr);
      if (nw !== w || nh !== h) {
        w = nw; h = nh;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize, { passive: true });

    const start = performance.now();
    let raf = 0;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 50; // soft 50fps cap

    const draw = (now: number) => {
      if (now - lastFrame < FRAME_MS) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;

      // Ease pointer
      mouse.x += (target.x - mouse.x) * 0.06;
      mouse.y += (target.y - mouse.y) * 0.06;

      // Inertial decay: velocityTarget bleeds toward 0, velocity follows
      // velocityTarget with damping — so a hard flick stretches the field
      // and the field SLOWLY drifts back to rest.
      velocityTarget *= 0.92;
      velocity += (velocityTarget - velocity) * 0.18;
      energy *= 0.93;

      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, (now - start) * 0.001);
      gl.uniform2f(uMouse, mouse.x * dpr, mouse.y * dpr);
      gl.uniform1f(uDpr, dpr);
      gl.uniform1f(uScroll, scrollAccum);
      gl.uniform1f(uVelocity, velocity);
      gl.uniform1f(uEnergy, energy);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('wheel', onWheel as any);
      window.removeEventListener('touchstart', onTouchStart as any);
      window.removeEventListener('touchmove', onTouchMove as any);
      delete (window as any).auralensEnergyPulse;
      try {
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);
      } catch { /* ignore */ }
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  // Canvas + grain sit at position:fixed, z-index:0. The body always gets an
  // obsidian background colour from injected CSS so even if WebGL fails the
  // page is dark, not white. pointer-events:none so they never intercept
  // clicks bound to the React UI.
  return (
    <>
      <canvas
        ref={ref}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          display: 'block',
          background: '#050507',
          pointerEvents: 'none',
        }}
      />
      {/* SVG-as-data-uri grain overlay for filmic texture. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: '220px 220px',
          opacity: 0.30,
          mixBlendMode: 'overlay',
        }}
      />
    </>
  );
}
