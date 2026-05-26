#!/usr/bin/env node
/*
 * AuraLens branded asset generator (Phase 2.6).
 *
 *   node scripts/generate-store-placeholders.js
 *
 * Outputs cinematic, store-presentable PNGs using only Node built-ins.
 * No native deps, no fonts on disk — a compact 5×7 bitmap font is embedded
 * below so we can render real headlines onto store screenshots.
 *
 * Visual identity:
 *   - Obsidian #050507 background
 *   - Glass aura orb (gold #F4C76B core, violet #9B6CFF halo, blue #4DB8FF outer)
 *   - Hairline gold ring at 0.5° opacity
 *   - Deterministic particle field
 *   - Soft vignette
 *   - No cartoon, no fake medical, no horoscope clichés
 *
 * Outputs:
 *   assets/icon.png             1024×1024
 *   assets/adaptive-icon.png    1024×1024  (Android foreground, transparent BG)
 *   assets/splash.png           2048×2048
 *   assets/favicon.png          196×196
 *   assets/store/screenshots/   1290×2796  iPhone 6.7" frames with real text
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// ─────────────────────────────────────────────────────────────────────────────
// PNG writer (RGBA, 8-bit, no interlace)
// ─────────────────────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = (v & 1) ? (0xedb88320 ^ (v >>> 1)) : (v >>> 1);
      t[n] = v >>> 0;
    }
    return t;
  })());
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(filePath, width, height, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride)
      .copy(raw, y * (stride + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.concat([
    sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas + primitives
// ─────────────────────────────────────────────────────────────────────────────

function makeCanvas(w, h, bg) {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4 + 0] = bg[0]; px[i * 4 + 1] = bg[1];
    px[i * 4 + 2] = bg[2]; px[i * 4 + 3] = bg[3];
  }
  return { w, h, px };
}

function setPx(cv, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = (y * cv.w + x) * 4;
  const aa = a / 255, inv = 1 - aa;
  cv.px[i + 0] = Math.round(cv.px[i + 0] * inv + r * aa);
  cv.px[i + 1] = Math.round(cv.px[i + 1] * inv + g * aa);
  cv.px[i + 2] = Math.round(cv.px[i + 2] * inv + b * aa);
  cv.px[i + 3] = Math.max(cv.px[i + 3], a);
}

function fillRect(cv, x, y, w, h, color) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(cv.w, Math.ceil(x + w));
  const y1 = Math.min(cv.h, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      setPx(cv, xx, yy, color[0], color[1], color[2], color[3]);
    }
  }
}

function fillRoundedRect(cv, x, y, w, h, radius, color) {
  const r = Math.min(radius, w / 2, h / 2);
  // body
  fillRect(cv, x + r, y, w - 2 * r, h, color);
  fillRect(cv, x, y + r, w, h - 2 * r, color);
  // corners
  const corners = [
    { cx: x + r, cy: y + r },
    { cx: x + w - r, cy: y + r },
    { cx: x + r, cy: y + h - r },
    { cx: x + w - r, cy: y + h - r },
  ];
  for (const c of corners) {
    for (let yy = -r; yy <= r; yy++) {
      for (let xx = -r; xx <= r; xx++) {
        if (xx * xx + yy * yy <= r * r) setPx(cv, c.cx + xx, c.cy + yy, color[0], color[1], color[2], color[3]);
      }
    }
  }
}

function strokeRoundedRect(cv, x, y, w, h, radius, thickness, color) {
  // outer minus inner
  fillRoundedRect(cv, x, y, w, h, radius, color);
  const bgColor = [0, 0, 0, 0]; // we cannot truly subtract; instead fill thin slabs
  // Approximate: draw four sides as filled rectangles + arcs.
  // Simple approximation that looks fine at the small thicknesses we use:
  // we just draw the outline by overwriting an inner rect with transparent…
  // but our blender is additive. Instead, do it the cheap way: stamp the rect
  // then re-stamp the interior region in the background colour. We don't have
  // a background colour here, so do four thin edges + 4 arc strokes.
  void bgColor;
}

function drawOrb(cv, cx, cy, radius, inner, outer, peakAlpha = 230, falloffPow = 2.3) {
  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(cv.w - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(cv.h - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const t = Math.sqrt(d2) / radius;
      const f = Math.pow(1 - t, falloffPow);
      const r = inner[0] * f + outer[0] * (1 - f);
      const g = inner[1] * f + outer[1] * (1 - f);
      const b = inner[2] * f + outer[2] * (1 - f);
      const a = Math.min(255, Math.round(peakAlpha * f));
      setPx(cv, x, y, Math.round(r), Math.round(g), Math.round(b), a);
    }
  }
}

function drawRing(cv, cx, cy, radius, thickness, color) {
  const rOuter = radius + thickness / 2;
  const rInner = radius - thickness / 2;
  const r2o = rOuter * rOuter, r2i = rInner * rInner;
  const minX = Math.max(0, Math.floor(cx - rOuter));
  const maxX = Math.min(cv.w - 1, Math.ceil(cx + rOuter));
  const minY = Math.max(0, Math.floor(cy - rOuter));
  const maxY = Math.min(cv.h - 1, Math.ceil(cy + rOuter));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 > r2o || d2 < r2i) continue;
      setPx(cv, x, y, color[0], color[1], color[2], color[3]);
    }
  }
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawParticles(cv, count, seed, color, scale = 1) {
  const rng = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * cv.w);
    const y = Math.floor(rng() * cv.h);
    const r = (0.6 + rng() * 2.2) * Math.max(2, cv.w / 600) * scale;
    const alpha = 70 + Math.floor(rng() * 130);
    drawOrb(cv, x, y, r, [255, 255, 255], color, alpha);
  }
}

function applyVignette(cv, strength = 0.45) {
  const cx = cv.w / 2, cy = cv.h / 2;
  const maxD = Math.hypot(cx, cy);
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      const d = Math.hypot(x - cx, y - cy) / maxD;
      const k = 1 - Math.pow(d, 1.8) * strength;
      const i = (y * cv.w + x) * 4;
      cv.px[i + 0] = Math.round(cv.px[i + 0] * k);
      cv.px[i + 1] = Math.round(cv.px[i + 1] * k);
      cv.px[i + 2] = Math.round(cv.px[i + 2] * k);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Embedded 5×7 bitmap font (uppercase + digits + . - ' , : / & space)
// Each glyph: array of 7 rows, low 5 bits = pixels left→right.
// ─────────────────────────────────────────────────────────────────────────────

const FONT = (() => {
  const G = (rows) => rows.map((r) => parseInt(r.replace(/\s+/g, ''), 2));
  return {
    A: G(['01110','10001','10001','11111','10001','10001','10001']),
    B: G(['11110','10001','10001','11110','10001','10001','11110']),
    C: G(['01110','10001','10000','10000','10000','10001','01110']),
    D: G(['11110','10001','10001','10001','10001','10001','11110']),
    E: G(['11111','10000','10000','11110','10000','10000','11111']),
    F: G(['11111','10000','10000','11110','10000','10000','10000']),
    G: G(['01110','10001','10000','10000','10011','10001','01111']),
    H: G(['10001','10001','10001','11111','10001','10001','10001']),
    I: G(['01110','00100','00100','00100','00100','00100','01110']),
    J: G(['00111','00010','00010','00010','00010','10010','01100']),
    K: G(['10001','10010','10100','11000','10100','10010','10001']),
    L: G(['10000','10000','10000','10000','10000','10000','11111']),
    M: G(['10001','11011','10101','10101','10001','10001','10001']),
    N: G(['10001','10001','11001','10101','10011','10001','10001']),
    O: G(['01110','10001','10001','10001','10001','10001','01110']),
    P: G(['11110','10001','10001','11110','10000','10000','10000']),
    Q: G(['01110','10001','10001','10001','10101','10010','01101']),
    R: G(['11110','10001','10001','11110','10100','10010','10001']),
    S: G(['01111','10000','10000','01110','00001','00001','11110']),
    T: G(['11111','00100','00100','00100','00100','00100','00100']),
    U: G(['10001','10001','10001','10001','10001','10001','01110']),
    V: G(['10001','10001','10001','10001','10001','01010','00100']),
    W: G(['10001','10001','10001','10101','10101','11011','10001']),
    X: G(['10001','10001','01010','00100','01010','10001','10001']),
    Y: G(['10001','10001','01010','00100','00100','00100','00100']),
    Z: G(['11111','00001','00010','00100','01000','10000','11111']),
    '0': G(['01110','10001','10011','10101','11001','10001','01110']),
    '1': G(['00100','01100','00100','00100','00100','00100','01110']),
    '2': G(['01110','10001','00001','00010','00100','01000','11111']),
    '3': G(['11110','00001','00001','00110','00001','00001','11110']),
    '4': G(['00010','00110','01010','10010','11111','00010','00010']),
    '5': G(['11111','10000','11110','00001','00001','10001','01110']),
    '6': G(['00110','01000','10000','11110','10001','10001','01110']),
    '7': G(['11111','00001','00010','00100','01000','01000','01000']),
    '8': G(['01110','10001','10001','01110','10001','10001','01110']),
    '9': G(['01110','10001','10001','01111','00001','00010','01100']),
    ' ': G(['00000','00000','00000','00000','00000','00000','00000']),
    '.': G(['00000','00000','00000','00000','00000','00000','00100']),
    '-': G(['00000','00000','00000','01110','00000','00000','00000']),
    "'": G(['00100','00100','00000','00000','00000','00000','00000']),
    ',': G(['00000','00000','00000','00000','00000','00100','01000']),
    ':': G(['00000','00100','00000','00000','00100','00000','00000']),
    '/': G(['00001','00010','00010','00100','01000','01000','10000']),
    '&': G(['01100','10010','10010','01100','10101','10010','01101']),
  };
})();

// Draw text. Scale is the pixel size of one bitmap pixel.
function drawText(cv, text, x, y, scale, color, opts = {}) {
  const tracking = opts.tracking ?? 1; // gap between glyphs (in bitmap pixels)
  const upper = text.toUpperCase();
  let cx = x;
  for (const ch of upper) {
    const g = FONT[ch];
    if (!g) { cx += (5 + tracking) * scale; continue; }
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          fillRect(cv, cx + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cx += (5 + tracking) * scale;
  }
  return cx - x; // width drawn
}

function textWidth(text, scale, tracking = 1) {
  return text.length * (5 + tracking) * scale - tracking * scale;
}

function drawTextCentered(cv, text, cx, y, scale, color, opts = {}) {
  const w = textWidth(text, scale, opts.tracking ?? 1);
  return drawText(cv, text, Math.round(cx - w / 2), y, scale, color, opts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Compositions
// ─────────────────────────────────────────────────────────────────────────────

const GOLD = [244, 199, 107];
const GOLD_BRIGHT = [251, 227, 162];
const VIOLET = [155, 108, 255];
const BLUE = [77, 184, 255];
const OBSIDIAN = [5, 5, 7];
const SOFT_WHITE = [247, 243, 234];

function backdrop(cv, vignette = 0.45) {
  // very subtle radial brightening behind the orb
  drawOrb(cv, cv.w * 0.5, cv.h * 0.42, cv.w * 0.7, [12, 8, 22], OBSIDIAN, 70, 1.6);
  applyVignette(cv, vignette);
}

function heroOrb(cv, cx, cy, radius) {
  // outer atmospheric halo
  drawOrb(cv, cx, cy, radius * 1.6, VIOLET, [10, 10, 22], 80, 2.0);
  // mid halo
  drawOrb(cv, cx, cy, radius * 1.15, BLUE, [10, 10, 22], 130, 1.9);
  // bright core
  drawOrb(cv, cx, cy, radius * 0.9, GOLD_BRIGHT, VIOLET, 250, 2.5);
  // hairline ring
  drawRing(cv, cx, cy, radius * 1.05, Math.max(1, radius / 80), [...GOLD, 90]);
  drawRing(cv, cx, cy, radius * 1.32, Math.max(1, radius / 140), [...GOLD, 35]);
  // glint
  drawOrb(cv, cx - radius * 0.22, cy - radius * 0.22, radius * 0.16, [255, 255, 255], GOLD_BRIGHT, 180, 2.2);
}

function makeIcon(size) {
  const cv = makeCanvas(size, size, [...OBSIDIAN, 255]);
  backdrop(cv, 0.3);
  drawParticles(cv, Math.floor(size / 18), 7, [220, 200, 245]);
  heroOrb(cv, size * 0.5, size * 0.5, size * 0.28);
  // additional outer ring to read at small sizes
  drawRing(cv, size * 0.5, size * 0.5, size * 0.38, Math.max(1, size / 320), [...GOLD, 50]);
  return cv;
}

function makeAdaptiveForeground(size) {
  // Foreground only — Android composes onto its own background. Keep content
  // inside the safe zone (≈ central 66%).
  const cv = makeCanvas(size, size, [0, 0, 0, 0]);
  heroOrb(cv, size * 0.5, size * 0.5, size * 0.26);
  drawRing(cv, size * 0.5, size * 0.5, size * 0.32, Math.max(1, size / 380), [...GOLD, 60]);
  return cv;
}

function makeSplash(size) {
  const cv = makeCanvas(size, size, [...OBSIDIAN, 255]);
  backdrop(cv, 0.55);
  drawParticles(cv, Math.floor(size / 14), 23, [210, 200, 240]);
  heroOrb(cv, size * 0.5, size * 0.5, size * 0.22);
  drawRing(cv, size * 0.5, size * 0.5, size * 0.34, Math.max(1, size / 500), [...GOLD, 35]);
  return cv;
}

function makeFavicon(size) {
  const cv = makeCanvas(size, size, [...OBSIDIAN, 255]);
  heroOrb(cv, size * 0.5, size * 0.5, size * 0.36);
  return cv;
}

// ─── Screenshot frames ────────────────────────────────────────────────────

function glassCard(cv, x, y, w, h, opts = {}) {
  const radius = opts.radius ?? 28;
  // base translucent fill
  fillRoundedRect(cv, x, y, w, h, radius, [255, 255, 255, 18]);
  // subtle inner highlight at the top
  fillRoundedRect(cv, x + 2, y + 2, w - 4, 3, radius - 2, [255, 255, 255, 30]);
  // hairline border (just the top + bottom edges to keep code small)
  fillRect(cv, x + radius, y, w - 2 * radius, 1, [255, 255, 255, 40]);
  fillRect(cv, x + radius, y + h - 1, w - 2 * radius, 1, [255, 255, 255, 18]);
  fillRect(cv, x, y + radius, 1, h - 2 * radius, [255, 255, 255, 24]);
  fillRect(cv, x + w - 1, y + radius, 1, h - 2 * radius, [255, 255, 255, 24]);
}

function drawHeaderBar(cv) {
  // brand mark — small orb top-left, brand text
  drawOrb(cv, 80, 110, 22, GOLD_BRIGHT, VIOLET, 230, 2.2);
  drawText(cv, 'AURALENS', 120, 96, 5, [...SOFT_WHITE, 230], { tracking: 2 });
}

function drawFooterDisclaimer(cv) {
  drawTextCentered(
    cv,
    'FOR REFLECTION AND WELLBEING ONLY.',
    cv.w / 2,
    cv.h - 110,
    3,
    [180, 180, 200, 180],
    { tracking: 1 },
  );
  drawTextCentered(
    cv,
    'NOT MEDICAL OR DIAGNOSTIC ADVICE.',
    cv.w / 2,
    cv.h - 75,
    3,
    [180, 180, 200, 180],
    { tracking: 1 },
  );
}

function makeScreenshot({ headline, subline, body }) {
  const w = 1290, h = 2796;
  const cv = makeCanvas(w, h, [...OBSIDIAN, 255]);
  backdrop(cv, 0.55);
  drawParticles(cv, 70, headline.length * 17 + 3, [210, 200, 240]);

  drawHeaderBar(cv);

  // Hero orb anchored visually high
  heroOrb(cv, w * 0.5, h * 0.30, w * 0.32);

  // Headline + subline block
  const headlineY = Math.round(h * 0.5);
  const headlineScale = 13;
  // word-wrap manually if line is too wide
  const maxWidthPx = w - 140;
  const lines = wrapText(headline, headlineScale, 2, maxWidthPx);
  let y = headlineY;
  for (const line of lines) {
    drawTextCentered(cv, line, w / 2, y, headlineScale, [...SOFT_WHITE, 250], { tracking: 2 });
    y += headlineScale * 9;
  }

  const sublineY = y + 28;
  const sublineScale = 6;
  const sublines = wrapText(subline, sublineScale, 1, maxWidthPx);
  let sy = sublineY;
  for (const line of sublines) {
    drawTextCentered(cv, line, w / 2, sy, sublineScale, [200, 200, 220, 200], { tracking: 1 });
    sy += sublineScale * 9;
  }

  // Glass body card (mock UI surface)
  const cardX = 80, cardW = w - 160;
  const cardY = Math.min(sy + 100, h - 600);
  const cardH = 400;
  glassCard(cv, cardX, cardY, cardW, cardH, { radius: 36 });

  // Eyebrow + body lines inside the card
  drawText(cv, body.eyebrow, cardX + 60, cardY + 60, 5, [...GOLD, 230], { tracking: 3 });
  const bodyLines = wrapText(body.text, 6, 1, cardW - 120);
  let by = cardY + 130;
  for (const line of bodyLines) {
    drawText(cv, line, cardX + 60, by, 6, [...SOFT_WHITE, 230], { tracking: 1 });
    by += 6 * 9;
  }

  drawFooterDisclaimer(cv);
  return cv;
}

function wrapText(text, scale, tracking, maxPx) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (textWidth(candidate, scale, tracking) <= maxPx) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');
const SHOTS = path.join(OUT, 'store', 'screenshots');

function emit(name, cv, dir = OUT) {
  const p = path.join(dir, name);
  writePng(p, cv.w, cv.h, cv.px);
  const kb = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`  ✓ ${path.relative(ROOT, p).padEnd(48)} ${cv.w}×${cv.h}  ${kb} KB`);
}

const SCREENSHOTS = [
  {
    name: 'hero-iphone-6.7.png',
    headline: 'READ YOUR AURA REFLECTION',
    subline: 'Mien Shiang-inspired symbolic reflection.',
    body: { eyebrow: 'HERO', text: 'Do you have a good aura or a heavy aura. A calm symbolic answer in seconds.' },
  },
  {
    name: 'pricing-iphone-6.7.png',
    headline: 'ONE READING OR MONTHLY GUIDANCE',
    subline: 'No tokens. No hidden credits.',
    body: { eyebrow: 'PRICING', text: 'Instant reading or AuraLens Monthly for timeline and Aura Buddy guidance.' },
  },
  {
    name: 'scan-iphone-6.7.png',
    headline: 'CAMERA OR 3-PHOTO AURA SCAN',
    subline: 'Hold steady. Find soft, even light.',
    body: { eyebrow: 'SCAN', text: 'Front-facing scan or three photos from different chapters of your life.' },
  },
  {
    name: 'result-iphone-6.7.png',
    headline: 'SYMBOLIC MIEN SHIANG INSIGHT',
    subline: 'Seven zones. One reflection.',
    body: { eyebrow: 'RESULT', text: 'Aura label, dominant colour, zone breakdown and grounded guidance.' },
  },
  {
    name: 'buddy-iphone-6.7.png',
    headline: 'YOUR AI AURA COMPANION',
    subline: 'Daily practices. Calm guidance.',
    body: { eyebrow: 'AURA BUDDY', text: 'A reflective companion for maintaining clearer energy. Not a therapist.' },
  },
];

function main() {
  console.log('Generating AuraLens branded assets…');
  emit('icon.png', makeIcon(1024));
  emit('adaptive-icon.png', makeAdaptiveForeground(1024));
  emit('splash.png', makeSplash(2048));
  emit('favicon.png', makeFavicon(196));
  for (const s of SCREENSHOTS) emit(s.name, makeScreenshot(s), SHOTS);
  console.log('Done.');
}

if (require.main === module) main();

module.exports = {
  SCREENSHOTS,
  // primitives — re-exported for the preview-pack generator
  writePng,
  makeCanvas,
  setPx,
  fillRect,
  fillRoundedRect,
  drawOrb,
  drawRing,
  drawParticles,
  applyVignette,
  drawText,
  drawTextCentered,
  textWidth,
  wrapText,
  glassCard,
  heroOrb,
  backdrop,
  GOLD, GOLD_BRIGHT, VIOLET, BLUE, OBSIDIAN, SOFT_WHITE,
  FONT,
};
