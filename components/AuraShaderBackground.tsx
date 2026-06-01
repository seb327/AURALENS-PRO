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
uniform float u_scroll;
uniform float u_velocity;
uniform float u_energy;

out vec4 fragColor;

// ─── AuraLens plasma grid ────────────────────────────────────────────────
// Adapted from the user-supplied violet plasma grid pattern. Domain-warped
// grid + N animated plasma lines, layered over a violet/indigo gradient.
// Aura-palette tweaks: line colour leans violet→gold, with mouse lobe and
// energy pulse modulating brightness.

const float overallSpeed = 0.18;
const float gridSmoothWidth = 0.015;
const float axisWidth = 0.04;
const float majorLineWidth = 0.022;
const float minorLineWidth = 0.011;
const float majorLineFrequency = 5.0;
const float minorLineFrequency = 1.0;
const float scale = 5.0;
const float minLineWidth = 0.01;
const float maxLineWidth = 0.20;
const float lineAmplitude = 1.0;
const float lineFrequency = 0.2;
const float warpFrequency = 0.5;
const float warpAmplitude = 1.0;
const float offsetFrequency = 0.5;
const float minOffsetSpread = 0.6;
const float maxOffsetSpread = 2.0;
const int linesPerGroup = 16;

#define drawCircle(pos, r, c) smoothstep(r + gridSmoothWidth, r, length(c - (pos)))
#define drawSmoothLine(pos, hw, t) smoothstep(hw, 0.0, abs(pos - (t)))
#define drawCrispLine(pos, hw, t) smoothstep(hw + gridSmoothWidth, hw, abs(pos - (t)))
#define drawPeriodicLine(freq, w, t) drawCrispLine(freq / 2.0, w, abs(mod(t, freq) - (freq) / 2.0))

float drawGridLines(float axis) {
  return drawCrispLine(0.0, axisWidth, axis)
        + drawPeriodicLine(majorLineFrequency, majorLineWidth, axis)
        + drawPeriodicLine(minorLineFrequency, minorLineWidth, axis);
}
float drawGrid(vec2 space) { return min(1.0, drawGridLines(space.x) + drawGridLines(space.y)); }

float rnd(float t) {
  return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
}

float getPlasmaY(float x, float fade, float offset, float lineSpeed) {
  return rnd(x * lineFrequency + u_time * lineSpeed) * fade * lineAmplitude + offset;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 res = u_resolution;
  vec2 uv = fragCoord.xy / res.xy;
  vec2 space = (fragCoord - res.xy / 2.0) / res.x * 2.0 * scale;

  // Velocity-coupled line speed — gestures speed the plasma up
  float velAbs = abs(u_velocity);
  float lineSpeed  = (1.0  + velAbs * 2.5) * overallSpeed;
  float warpSpeed  = (0.2  + velAbs * 0.8) * overallSpeed;
  float offsetSpeed = (1.33 + velAbs * 1.5) * overallSpeed;

  float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
  float verticalFade   = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

  space.y += rnd(space.x * warpFrequency + u_time * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
  space.x += rnd(space.y * warpFrequency + u_time * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

  vec4 lines = vec4(0.0);
  vec4 bgColor1 = vec4(0.052, 0.040, 0.130, 1.0);  // deep indigo (AuraLens)
  vec4 bgColor2 = vec4(0.180, 0.090, 0.330, 1.0);  // violet
  // Line colour shifts gold under fast motion / energy bloom; otherwise violet
  vec4 lineColor = vec4(
    mix(0.40, 0.92, velAbs + u_energy * 0.5),
    mix(0.22, 0.66, velAbs + u_energy * 0.5),
    mix(0.84, 0.30, velAbs + u_energy * 0.5),
    1.0
  );

  for (int l = 0; l < linesPerGroup; l++) {
    float normalizedLineIndex = float(l) / float(linesPerGroup);
    float offsetTime = u_time * offsetSpeed;
    float offsetPosition = float(l) + space.x * offsetFrequency;
    float rand = rnd(offsetPosition + offsetTime) * 0.5 + 0.5;
    float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
    float offset = rnd(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
    float linePosition = getPlasmaY(space.x, horizontalFade, offset, lineSpeed);
    float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0
               + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

    float circleX = mod(float(l) + u_time * lineSpeed, 25.0) - 12.0;
    vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset, lineSpeed));
    float circle = drawCircle(circlePosition, 0.01, space) * 4.0;

    line = line + circle;
    lines += line * lineColor * rand;
  }

  vec4 col = mix(bgColor1, bgColor2, uv.x);
  col *= verticalFade;
  col.a = 1.0;
  col += lines;

  // Pointer light lobe — soft warmth following the cursor
  vec2 mouseUV = u_mouse / res.xy;
  float md = length(uv - mouseUV);
  col.rgb += vec3(0.95, 0.78, 0.42) * exp(-md * 5.0) * 0.18;

  // Energy pulse — radial bloom on user action
  vec2 centred = uv - vec2(0.5);
  col.rgb += vec3(0.98, 0.85, 0.55) * u_energy * exp(-length(centred) * 1.8) * 0.35;

  // Gentle vignette
  float vign = smoothstep(1.10, 0.30, length(centred));
  col.rgb *= mix(0.68, 1.0, vign);

  fragColor = col;
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
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
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
