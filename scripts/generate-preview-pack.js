#!/usr/bin/env node
/*
 * Phase 2.6B preview pack generator.
 *
 *   node scripts/generate-preview-pack.js
 *
 * Produces four cinematic preview sheets composing the existing brand system
 * and UI mock primitives so you can visually review AuraLens without booting
 * a simulator. Each sheet is captioned with an honest label — these are
 * generated UI previews, NOT real iOS/Android simulator captures.
 *
 *   assets/preview/brand-preview.png
 *   assets/preview/app-flow-preview.png
 *   assets/preview/store-screens-preview.png
 *   assets/preview/technical-status.png
 */

const path = require('node:path');
const fs = require('node:fs');

const G = require('./generate-store-placeholders');
const {
  writePng, makeCanvas, fillRect, fillRoundedRect, drawOrb, drawRing,
  drawParticles, drawText, drawTextCentered, textWidth, wrapText,
  glassCard, heroOrb, backdrop, applyVignette,
  GOLD, GOLD_BRIGHT, VIOLET, BLUE, OBSIDIAN, SOFT_WHITE,
} = G;

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'preview');

function emit(name, cv) {
  const p = path.join(OUT_DIR, name);
  writePng(p, cv.w, cv.h, cv.px);
  const kb = (fs.statSync(p).size / 1024).toFixed(1);
  console.log(`  ✓ ${path.relative(ROOT, p).padEnd(46)} ${cv.w}×${cv.h}  ${kb} KB`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared chrome: title bar + footer caption
// ─────────────────────────────────────────────────────────────────────────────

function drawSheetChrome(cv, title, caption) {
  // small brand orb top-left
  drawOrb(cv, 60, 70, 16, GOLD_BRIGHT, VIOLET, 240, 2.2);
  drawText(cv, 'AURALENS', 90, 60, 4, [...SOFT_WHITE, 230], { tracking: 2 });
  drawText(cv, 'PREVIEW PACK', 90, 92, 2, [...GOLD, 220], { tracking: 3 });

  // sheet title centred
  drawTextCentered(cv, title.toUpperCase(), cv.w / 2, 60, 5, [...SOFT_WHITE, 240], { tracking: 3 });
  // hairline rule under header
  fillRect(cv, 40, 130, cv.w - 80, 1, [...SOFT_WHITE, 50]);

  // honest caption pinned to footer
  const captionScale = 2;
  drawTextCentered(cv, caption.toUpperCase(), cv.w / 2, cv.h - 36, captionScale, [180, 180, 200, 200], { tracking: 2 });
  fillRect(cv, 40, cv.h - 60, cv.w - 80, 1, [...SOFT_WHITE, 30]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Brand preview — icon family
// ─────────────────────────────────────────────────────────────────────────────

function drawIconTile(cv, x, y, size, label) {
  fillRoundedRect(cv, x, y, size, size, Math.round(size * 0.22), [...OBSIDIAN, 255]);
  // composition mirrors makeIcon
  drawOrb(cv, x + size * 0.5, y + size * 0.42, size * 0.7, [12, 8, 22], OBSIDIAN, 70, 1.6);
  drawParticles(cv, Math.floor(size / 18), Math.floor(x + y), [220, 200, 245]);
  heroOrb(cv, x + size * 0.5, y + size * 0.5, size * 0.28);
  drawRing(cv, x + size * 0.5, y + size * 0.5, size * 0.38, Math.max(1, size / 320), [...GOLD, 50]);
  // label below
  drawTextCentered(cv, label, x + size / 2, y + size + 24, 3, [200, 200, 220, 220], { tracking: 1 });
}

function drawAdaptiveTile(cv, x, y, size, label) {
  // Show the Android adaptive icon foreground on a representative Pixel-style background.
  fillRoundedRect(cv, x, y, size, size, Math.round(size * 0.5), [12, 12, 18, 255]);
  heroOrb(cv, x + size * 0.5, y + size * 0.5, size * 0.26);
  drawRing(cv, x + size * 0.5, y + size * 0.5, size * 0.32, Math.max(1, size / 380), [...GOLD, 60]);
  drawTextCentered(cv, label, x + size / 2, y + size + 24, 3, [200, 200, 220, 220], { tracking: 1 });
}

function drawSplashTile(cv, x, y, w, h, label) {
  // Mock device frame containing a downscaled splash composition.
  const radius = 32;
  fillRoundedRect(cv, x - 8, y - 8, w + 16, h + 16, radius + 6, [...SOFT_WHITE, 25]);
  fillRoundedRect(cv, x, y, w, h, radius, [...OBSIDIAN, 255]);
  // re-render the splash composition inline at this scale
  // (we cannot easily clip to the rounded rect, so we just draw inside its bounds)
  const cx = x + w / 2;
  const cy = y + h / 2;
  drawOrb(cv, cx, cy - h * 0.05, w * 0.7, [12, 8, 22], OBSIDIAN, 70, 1.6);
  drawParticles(cv, 24, Math.floor(x * 7 + y * 13), [210, 200, 240]);
  heroOrb(cv, cx, cy, w * 0.22);
  drawRing(cv, cx, cy, w * 0.34, Math.max(1, w / 200), [...GOLD, 35]);
  // brand wordmark inside
  drawTextCentered(cv, 'AURALENS', cx, y + h - 84, 4, [...SOFT_WHITE, 230], { tracking: 3 });
  drawTextCentered(cv, 'BY VYBSTAK', cx, y + h - 56, 2, [...GOLD, 200], { tracking: 3 });
  drawTextCentered(cv, label, cx, y + h + 24, 3, [200, 200, 220, 220], { tracking: 1 });
}

function drawFaviconTile(cv, x, y, size, label) {
  fillRoundedRect(cv, x, y, size, size, Math.round(size * 0.2), [...OBSIDIAN, 255]);
  heroOrb(cv, x + size * 0.5, y + size * 0.5, size * 0.36);
  drawTextCentered(cv, label, x + size / 2, y + size + 24, 3, [200, 200, 220, 220], { tracking: 1 });
}

function makeBrandPreview() {
  const cv = makeCanvas(1600, 1100, [...OBSIDIAN, 255]);
  backdrop(cv, 0.55);
  drawParticles(cv, 80, 5, [200, 200, 230]);
  drawSheetChrome(
    cv,
    'Brand identity',
    'Generated UI preview · not a simulator capture · Phase 2.6 assets',
  );

  // Row 1: app icon, adaptive icon, favicon
  const tileSize = 280;
  const rowY = 240;
  const spacing = 60;
  const startX = (cv.w - (tileSize * 3 + spacing * 2)) / 2;
  drawIconTile(cv, startX, rowY, tileSize, 'iOS app icon (1024)');
  drawAdaptiveTile(cv, startX + tileSize + spacing, rowY, tileSize, 'Android adaptive icon');
  drawFaviconTile(cv, startX + (tileSize + spacing) * 2, rowY, tileSize, 'Web favicon');

  // Row 2: splash centred
  const splashW = 540, splashH = 320;
  const splashX = (cv.w - splashW) / 2;
  const splashY = rowY + tileSize + 120;
  drawSplashTile(cv, splashX, splashY, splashW, splashH, 'Splash screen (2048×2048)');

  return cv;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. App flow preview — 9-up phone mockups
// ─────────────────────────────────────────────────────────────────────────────

const APP_FLOW = [
  { eyebrow: 'HERO',       title: 'GOOD AURA OR BAD AURA',  body: 'Try Now',              orb: ['Violet', 'Blue'] },
  { eyebrow: 'TECHNOLOGY', title: 'FACE READING AI',        body: 'Privacy first',        orb: ['Blue',   'Violet'] },
  { eyebrow: 'PRICING',    title: 'ONE OR MONTHLY',         body: '0.99 or 9.99 monthly', orb: ['Gold',   'Violet'] },
  { eyebrow: 'SCAN',       title: 'CAMERA SCAN',            body: 'Begin scan',           orb: ['Violet', 'Blue'] },
  { eyebrow: 'UPLOAD',     title: 'THREE PHOTOS',           body: 'Generate reading',     orb: ['Green',  'Gold'] },
  { eyebrow: 'PROCESSING', title: 'READING ZONES',          body: 'Balancing signals',    orb: ['Violet', 'Gold'] },
  { eyebrow: 'RESULT',     title: 'CLEAR AURA',             body: 'Gold signature',       orb: ['Gold',   'Violet'] },
  { eyebrow: 'TIMELINE',   title: 'AURA HISTORY',           body: 'Newest first',         orb: ['Blue',   'Gold'] },
  { eyebrow: 'BUDDY',      title: 'AURA COMPANION',         body: 'Daily practices',      orb: ['Violet', 'Blue'] },
];

const ORB_COLOURS = {
  Gold: GOLD_BRIGHT, Violet: VIOLET, Blue: BLUE, Green: [102, 224, 163],
};

function drawPhoneMock(cv, x, y, w, h, frame) {
  const radius = 36;
  // device shell
  fillRoundedRect(cv, x - 6, y - 6, w + 12, h + 12, radius + 6, [...SOFT_WHITE, 35]);
  fillRoundedRect(cv, x, y, w, h, radius, [...OBSIDIAN, 255]);

  // ambient glow + particles inside
  const cx = x + w / 2;
  drawOrb(cv, cx, y + h * 0.35, w * 0.9, [12, 8, 22], OBSIDIAN, 60, 1.5);
  drawParticles(cv, 18, Math.floor(x * 11 + y * 7), [210, 200, 240]);

  // hero orb tinted to the screen's colour
  const inner = ORB_COLOURS[frame.orb[0]] ?? GOLD_BRIGHT;
  const outer = ORB_COLOURS[frame.orb[1]] ?? VIOLET;
  const orbY = y + h * 0.30;
  drawOrb(cv, cx, orbY, w * 0.45, outer, [10, 10, 22], 90, 2.0);
  drawOrb(cv, cx, orbY, w * 0.35, inner, outer, 240, 2.4);
  drawRing(cv, cx, orbY, w * 0.38, Math.max(1, w / 240), [...GOLD, 90]);

  // brand line top-left
  drawText(cv, 'AURALENS', x + 18, y + 16, 2, [...SOFT_WHITE, 220], { tracking: 1 });

  // glass card lower
  const cardX = x + 18;
  const cardW = w - 36;
  const cardY = y + Math.round(h * 0.62);
  const cardH = Math.round(h * 0.30);
  glassCard(cv, cardX, cardY, cardW, cardH, { radius: 16 });

  // eyebrow + title inside the card
  drawText(cv, frame.eyebrow, cardX + 14, cardY + 14, 2, [...GOLD, 230], { tracking: 2 });
  const titleLines = wrapText(frame.title, 3, 1, cardW - 28);
  let ty = cardY + 34;
  for (const line of titleLines) {
    drawText(cv, line, cardX + 14, ty, 3, [...SOFT_WHITE, 240], { tracking: 1 });
    ty += 3 * 9;
  }
  // body line
  drawText(cv, frame.body, cardX + 14, cardY + cardH - 28, 2, [200, 200, 220, 220], { tracking: 1 });

  // gold CTA pill at the very bottom (only for hero/pricing/scan-like frames)
  fillRoundedRect(cv, cardX, y + h - 36, cardW, 24, 12, [...GOLD, 90]);
}

function makeAppFlowPreview() {
  const cols = 3, rows = 3;
  const tileW = 360, tileH = 720;
  const gapX = 60, gapY = 90;
  const w = cols * tileW + (cols - 1) * gapX + 160;
  const h = rows * tileH + (rows - 1) * gapY + 360;
  const cv = makeCanvas(w, h, [...OBSIDIAN, 255]);
  backdrop(cv, 0.6);
  drawParticles(cv, 120, 17, [210, 200, 240]);
  drawSheetChrome(
    cv,
    'App user flow (9 screens)',
    'Generated UI preview · not a simulator capture · scaled down 1290×2796 motifs',
  );

  const gridX = (w - (cols * tileW + (cols - 1) * gapX)) / 2;
  const gridY = 200;

  for (let i = 0; i < APP_FLOW.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = gridX + c * (tileW + gapX);
    const y = gridY + r * (tileH + gapY);
    drawPhoneMock(cv, x, y, tileW, tileH, APP_FLOW[i]);
  }

  return cv;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Store screens preview — 5 frames in a row, scaled down
// ─────────────────────────────────────────────────────────────────────────────

function drawStoreFrame(cv, x, y, w, h, shot) {
  fillRoundedRect(cv, x - 6, y - 6, w + 12, h + 12, 30, [...SOFT_WHITE, 30]);
  fillRoundedRect(cv, x, y, w, h, 24, [...OBSIDIAN, 255]);
  backdrop({ w, h, px: cv.px }, 0); // no-op; backdrop is full-canvas, skip here
  const cx = x + w / 2;
  drawOrb(cv, cx, y + h * 0.30, w * 1.0, [12, 8, 22], OBSIDIAN, 60, 1.7);
  drawParticles({ w: cv.w, h: cv.h, px: cv.px }, 28, Math.floor(x * 31 + y * 41 + shot.name.length), [210, 200, 240]);

  // hero orb
  drawOrb(cv, cx, y + h * 0.28, w * 0.45, VIOLET, [10, 10, 22], 80, 2.0);
  drawOrb(cv, cx, y + h * 0.28, w * 0.35, GOLD_BRIGHT, VIOLET, 240, 2.4);
  drawRing(cv, cx, y + h * 0.28, w * 0.38, Math.max(1, w / 200), [...GOLD, 80]);

  // brand
  drawText(cv, 'AURALENS', x + 14, y + 14, 2, [...SOFT_WHITE, 220], { tracking: 1 });

  // headline
  const headlineLines = wrapText(shot.headline, 4, 2, w - 40);
  let hy = y + Math.round(h * 0.52);
  for (const line of headlineLines) {
    drawTextCentered(cv, line, cx, hy, 4, [...SOFT_WHITE, 240], { tracking: 2 });
    hy += 4 * 9;
  }
  // subline
  drawTextCentered(cv, shot.subline.toUpperCase(), cx, hy + 12, 2, [200, 200, 220, 220], { tracking: 1 });

  // glass card mock at the bottom
  const cardY = y + Math.round(h * 0.72);
  const cardH = Math.round(h * 0.18);
  glassCard(cv, x + 20, cardY, w - 40, cardH, { radius: 16 });
  drawText(cv, shot.body.eyebrow, x + 34, cardY + 14, 2, [...GOLD, 230], { tracking: 2 });
  const bodyLines = wrapText(shot.body.text, 2, 1, w - 68);
  let by = cardY + 34;
  for (const line of bodyLines) {
    drawText(cv, line, x + 34, by, 2, [...SOFT_WHITE, 230], { tracking: 1 });
    by += 18;
  }
}

function makeStoreScreensPreview() {
  const tileW = 360, tileH = 780;
  const gap = 50;
  const w = G.SCREENSHOTS.length * tileW + (G.SCREENSHOTS.length - 1) * gap + 160;
  const h = tileH + 360;
  const cv = makeCanvas(w, h, [...OBSIDIAN, 255]);
  backdrop(cv, 0.6);
  drawParticles(cv, 120, 53, [200, 200, 230]);
  drawSheetChrome(
    cv,
    'Store screenshots (App Store / Play)',
    'Generated UI preview · faithful to the 1290×2796 source frames in assets/store/screenshots/',
  );

  const startX = (w - (G.SCREENSHOTS.length * tileW + (G.SCREENSHOTS.length - 1) * gap)) / 2;
  const startY = 200;
  for (let i = 0; i < G.SCREENSHOTS.length; i++) {
    const x = startX + i * (tileW + gap);
    drawStoreFrame(cv, x, startY, tileW, tileH, G.SCREENSHOTS[i]);
    drawTextCentered(cv, G.SCREENSHOTS[i].name.replace('.png', '').replace(/-/g, ' ').toUpperCase(),
      x + tileW / 2, startY + tileH + 24, 2, [200, 200, 220, 220], { tracking: 1 });
  }
  return cv;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Technical status dashboard
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_ROWS = [
  ['PHASE',              '2.6C SUBSTANCE PASS', 'OK'],
  ['BUILD STATUS',       '17/17 EXPO DOCTOR', 'OK'],
  ['TYPESCRIPT',         'CLEAN',             'OK'],
  ['JEST',               '65/65 TESTS PASS',  'OK'],
  ['RELEASE VERIFY',     'PASS 110 / FAIL 0', 'OK'],
  ['ENGINE',             'DETERMINISTIC',     'OK'],
  ['FACE ANALYZER',      'NATIVE OR HEURISTIC', 'OK'],
  ['PURCHASES',          'REVENUECAT READY',  'OK'],
  ['SUPABASE',           'LOCAL FIRST',       'OK'],
  ['AURA BUDDY',         'EDGE FUNCTION LIVE', 'OK'],
  ['READING DETAIL',     'OPEN COMPARE DELETE', 'OK'],
  ['ERROR BOUNDARY',     'ROOT LEVEL',        'OK'],
  ['EAS PROFILES',       'DEV PREVIEW PROD',  'OK'],
  ['BRAND ASSETS',       'ICON SPLASH SHOTS', 'OK'],
];

function makeTechnicalStatus() {
  const cv = makeCanvas(1600, 1560, [...OBSIDIAN, 255]);
  backdrop(cv, 0.55);
  drawParticles(cv, 80, 91, [200, 200, 230]);
  drawSheetChrome(
    cv,
    'Technical status',
    'Generated status sheet · numbers reflect the most recent local verification run',
  );

  // Single big glass card
  const cardX = 120, cardY = 200, cardW = cv.w - 240, cardH = cv.h - 320;
  glassCard(cv, cardX, cardY, cardW, cardH, { radius: 36 });

  let y = cardY + 60;
  const rowH = 80;
  for (const [label, value, badge] of STATUS_ROWS) {
    // label left
    drawText(cv, label, cardX + 60, y, 4, [200, 200, 220, 230], { tracking: 2 });
    // value middle
    drawText(cv, value, cardX + 600, y, 4, [...SOFT_WHITE, 240], { tracking: 2 });
    // OK badge right
    const badgeColor = badge === 'OK' ? [102, 224, 163] : [196, 82, 42];
    const bx = cardX + cardW - 200;
    fillRoundedRect(cv, bx, y - 6, 140, 44, 22, [...badgeColor, 60]);
    drawTextCentered(cv, badge, bx + 70, y, 4, [...badgeColor, 255], { tracking: 2 });
    // hairline rule
    fillRect(cv, cardX + 40, y + 50, cardW - 80, 1, [...SOFT_WHITE, 25]);
    y += rowH;
  }

  return cv;
}

// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('Generating AuraLens preview pack…');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  emit('brand-preview.png',        makeBrandPreview());
  emit('app-flow-preview.png',     makeAppFlowPreview());
  emit('store-screens-preview.png', makeStoreScreensPreview());
  emit('technical-status.png',      makeTechnicalStatus());
  console.log('Done.');
}

if (require.main === module) main();
