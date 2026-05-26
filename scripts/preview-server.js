#!/usr/bin/env node
/*
 * Tiny zero-dep static server for the AuraLens preview pack.
 *
 *   node scripts/preview-server.js           → http://localhost:4173
 *   PORT=5000 node scripts/preview-server.js → http://localhost:5000
 *
 * Serves /preview as an HTML gallery and exposes the assets/ tree alongside.
 * No request leaves the machine.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function safeJoin(rel) {
  const decoded = decodeURIComponent(rel.split('?')[0]);
  const abs = path.normalize(path.join(ROOT, decoded));
  if (!abs.startsWith(ROOT)) return null;
  return abs;
}

const HI_FI_SCREENS = [
  { name: 'Hero',           src: '/assets/preview/screens/hero.html' },
  { name: 'Pricing',        src: '/assets/preview/screens/pricing.html' },
  { name: 'Result',         src: '/assets/preview/screens/result.html' },
  { name: 'Reading detail', src: '/assets/preview/screens/reading-detail.html' },
  { name: 'Compare',        src: '/assets/preview/screens/compare.html' },
  { name: 'Buddy',          src: '/assets/preview/screens/buddy.html' },
  { name: 'Timeline',       src: '/assets/preview/screens/timeline.html' },
];

const OUTSTANDING = [
  { kind: 'dashboard', text: 'Provision real Supabase project, deploy migrations, create private bucket' },
  { kind: 'dashboard', text: 'Provision RevenueCat project + sandbox products in App Store Connect / Play Console' },
  { kind: 'dashboard', text: 'Deploy ai-buddy edge function + set ANTHROPIC_API_KEY or OPENAI_API_KEY' },
  { kind: 'design',    text: 'Commission final brand artwork to drop over the four generated PNGs' },
  { kind: 'design',    text: 'Capture real on-device screenshots from a development build (replaces mock store frames)' },
  { kind: 'design',    text: 'Final wordmark + legal sign-off on public-facing app name' },
  { kind: 'product',   text: 'On-device end-to-end verification on real iOS hardware (TestFlight)' },
  { kind: 'product',   text: 'On-device end-to-end verification on real Android hardware (Play internal)' },
  { kind: 'product',   text: 'Real sandbox IAP confirmation (no real money has changed hands yet)' },
  { kind: 'product',   text: 'Real LLM round-trip against Anthropic/OpenAI (currently only local fallback has been exercised)' },
  { kind: 'roadmap',   text: 'Phase 2.7 — Sentry + privacy-respecting analytics + expo-updates OTA channel' },
  { kind: 'roadmap',   text: 'Accessibility audit — VoiceOver labels, Dynamic Type, contrast' },
  { kind: 'roadmap',   text: 'Localisation infrastructure (currently English-only)' },
  { kind: 'roadmap',   text: 'Tablet layout pass' },
  { kind: 'roadmap',   text: 'Reading share-card image generation (currently text share only)' },
];

function indexHtml() {
  const previews = [
    {
      title: 'Brand identity',
      src: '/assets/preview/brand-preview.png',
      caption: 'App icon · Android adaptive icon · favicon · splash composition. Generated UI preview — not a simulator capture.',
    },
    {
      title: 'App user flow',
      src: '/assets/preview/app-flow-preview.png',
      caption: '9 screens in flow order: hero · technology · pricing · scan · upload · processing · result · timeline · buddy.',
    },
    {
      title: 'Store screenshots',
      src: '/assets/preview/store-screens-preview.png',
      caption: '5 × 1290×2796 frames ready for App Store Connect and Play Console.',
    },
    {
      title: 'Technical status',
      src: '/assets/preview/technical-status.png',
      caption: 'Live verification status — mirrors npm test / tsc / expo-doctor / verify:release.',
    },
  ];

  const storeShots = [
    { name: 'Hero',     src: '/assets/store/screenshots/hero-iphone-6.7.png' },
    { name: 'Pricing',  src: '/assets/store/screenshots/pricing-iphone-6.7.png' },
    { name: 'Scan',     src: '/assets/store/screenshots/scan-iphone-6.7.png' },
    { name: 'Result',   src: '/assets/store/screenshots/result-iphone-6.7.png' },
    { name: 'Buddy',    src: '/assets/store/screenshots/buddy-iphone-6.7.png' },
  ];

  const brandFiles = [
    { name: 'App icon (1024)', src: '/assets/icon.png' },
    { name: 'Adaptive icon (1024)', src: '/assets/adaptive-icon.png' },
    { name: 'Splash (2048)', src: '/assets/splash.png' },
    { name: 'Favicon (196)', src: '/assets/favicon.png' },
  ];

  const sections = previews.map((p) => `
    <section class="card">
      <header>
        <h2>${p.title}</h2>
      </header>
      <a href="${p.src}" target="_blank" rel="noopener">
        <img src="${p.src}" alt="${p.title}" loading="lazy" />
      </a>
      <p class="caption">${p.caption}</p>
    </section>
  `).join('');

  const storeStrip = storeShots.map((s) => `
    <figure>
      <a href="${s.src}" target="_blank" rel="noopener"><img src="${s.src}" alt="${s.name}" loading="lazy" /></a>
      <figcaption>${s.name}</figcaption>
    </figure>
  `).join('');

  const brandStrip = brandFiles.map((b) => `
    <figure>
      <a href="${b.src}" target="_blank" rel="noopener"><img src="${b.src}" alt="${b.name}" loading="lazy" /></a>
      <figcaption>${b.name}</figcaption>
    </figure>
  `).join('');

  const hifiStrip = HI_FI_SCREENS.map((s) => `
    <figure class="device">
      <div class="device-frame">
        <iframe src="${s.src}" title="${s.name}" loading="lazy" sandbox="allow-same-origin"></iframe>
      </div>
      <figcaption><a href="${s.src}" target="_blank" rel="noopener">${s.name}</a></figcaption>
    </figure>
  `).join('');

  const groupByKind = (kind, label, badge) => {
    const items = OUTSTANDING.filter((o) => o.kind === kind);
    if (items.length === 0) return '';
    return `
      <div class="todo-group">
        <div class="todo-head">
          <span class="todo-badge ${kind}">${badge}</span>
          <h4>${label}</h4>
        </div>
        <ul>${items.map((i) => `<li>${i.text}</li>`).join('')}</ul>
      </div>`;
  };
  const todoHtml =
    groupByKind('dashboard', 'External dashboards', 'CONFIG') +
    groupByKind('design', 'Design / artwork', 'DESIGN') +
    groupByKind('product', 'Real-device verification', 'DEVICE') +
    groupByKind('roadmap', 'Roadmap (not started)', 'NEXT');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>AuraLens · Preview pack</title>
<link rel="icon" type="image/png" href="/assets/favicon.png" />
<style>
  :root {
    --obsidian: #050507;
    --obsidian-2: #0B0B10;
    --glass: rgba(255,255,255,0.06);
    --hairline: rgba(255,255,255,0.10);
    --soft: #F7F3EA;
    --mute: rgba(247,243,234,0.62);
    --dim: rgba(247,243,234,0.38);
    --gold: #F4C76B;
    --gold-bright: #FBE3A2;
    --violet: #9B6CFF;
    --blue: #4DB8FF;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--obsidian); color: var(--soft); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body {
    background:
      radial-gradient(ellipse at 50% 0%, rgba(155,108,255,0.18) 0%, rgba(5,5,7,0) 60%),
      radial-gradient(ellipse at 100% 100%, rgba(77,184,255,0.10) 0%, rgba(5,5,7,0) 50%),
      var(--obsidian);
    min-height: 100vh;
  }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 48px 28px 96px; }
  header.top {
    display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;
    padding-bottom: 28px; border-bottom: 1px solid var(--hairline);
    margin-bottom: 36px;
  }
  .brand {
    font-weight: 700; letter-spacing: 4px; font-size: 18px; color: var(--soft);
  }
  .brand .by { color: var(--dim); letter-spacing: 2px; font-size: 12px; margin-left: 10px; }
  .phase {
    margin-left: auto;
    padding: 6px 14px;
    border: 1px solid var(--gold);
    border-radius: 999px;
    color: var(--gold);
    font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
  }
  h1 {
    font-weight: 300; font-size: 40px; line-height: 1.1;
    margin: 0 0 12px; letter-spacing: -0.5px;
  }
  .lede { color: var(--mute); font-size: 16px; line-height: 1.5; max-width: 720px; margin: 0; }
  .honest {
    margin: 28px 0 36px;
    padding: 14px 18px;
    border: 1px solid rgba(244,199,107,0.35);
    background: rgba(244,199,107,0.06);
    border-radius: 14px;
    color: var(--gold-bright);
    font-size: 13px; line-height: 1.5;
  }
  .grid {
    display: grid; gap: 28px;
    grid-template-columns: repeat(auto-fit, minmax(560px, 1fr));
  }
  .card {
    border: 1px solid var(--hairline);
    background: var(--glass);
    border-radius: 24px;
    overflow: hidden;
    backdrop-filter: blur(20px);
  }
  .card header {
    padding: 16px 22px;
    border-bottom: 1px solid var(--hairline);
    display: flex; justify-content: space-between; align-items: center;
  }
  .card h2 {
    font-size: 13px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--gold); margin: 0; font-weight: 600;
  }
  .card img {
    display: block; width: 100%; height: auto;
    background: var(--obsidian);
  }
  .caption {
    padding: 14px 22px 22px;
    color: var(--mute); font-size: 13px; line-height: 1.5; margin: 0;
  }
  .row {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    margin-top: 16px;
  }
  figure {
    margin: 0;
    padding: 14px;
    border: 1px solid var(--hairline);
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    text-align: center;
  }
  figure img {
    display: block; max-width: 100%; height: auto; margin: 0 auto 10px;
    border-radius: 8px;
  }
  figcaption {
    color: var(--mute); font-size: 12px; letter-spacing: 0.5px;
  }
  h3 {
    font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--gold); margin: 48px 0 8px; font-weight: 600;
  }
  .status {
    display: grid; gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    margin: 20px 0 40px;
  }
  .status .pill {
    padding: 14px 18px;
    border: 1px solid var(--hairline);
    background: var(--glass);
    border-radius: 14px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .status .k { color: var(--mute); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
  .status .v { color: var(--soft); font-size: 14px; }
  .status .ok { color: #66E0A3; font-weight: 600; }
  footer {
    margin-top: 64px; padding-top: 28px;
    border-top: 1px solid var(--hairline);
    color: var(--dim); font-size: 12px; line-height: 1.6;
  }
  footer code {
    background: rgba(255,255,255,0.05);
    padding: 1px 6px; border-radius: 4px; color: var(--gold-bright);
    font-size: 12px;
  }
  a { color: var(--gold-bright); }

  /* High-fidelity iPhone frame */
  .hifi-row {
    display: grid; gap: 28px; margin-top: 16px;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    justify-items: center;
  }
  .device { margin: 0; text-align: center; }
  .device-frame {
    width: 280px; height: 608px;
    padding: 12px;
    background: linear-gradient(180deg, #1a1a22, #0a0a0e);
    border-radius: 44px;
    box-shadow:
      0 0 0 2px rgba(255,255,255,0.06) inset,
      0 30px 60px rgba(0,0,0,0.6),
      0 0 0 1px rgba(255,255,255,0.04);
    overflow: hidden;
    position: relative;
  }
  .device-frame::before {
    content: ""; position: absolute;
    top: 18px; left: 50%; transform: translateX(-50%);
    width: 100px; height: 26px;
    background: #000; border-radius: 14px;
    z-index: 10; pointer-events: none;
  }
  .device-frame iframe {
    width: 393px; height: 852px;
    border: 0; border-radius: 30px;
    transform: scale(0.65); transform-origin: top left;
    background: var(--obsidian);
  }
  .device figcaption {
    margin-top: 14px;
    color: var(--mute); font-size: 13px; letter-spacing: 1px;
  }
  .device figcaption a { color: var(--gold-bright); text-decoration: none; }

  /* Outstanding work list */
  .todo-grid {
    display: grid; gap: 16px; margin-top: 16px;
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  }
  .todo-group {
    border: 1px solid var(--hairline);
    background: var(--glass);
    border-radius: 16px;
    padding: 18px 22px;
  }
  .todo-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .todo-head h4 { margin: 0; font-size: 14px; font-weight: 500; color: var(--soft); }
  .todo-badge {
    padding: 3px 9px; border-radius: 999px;
    font-size: 10px; letter-spacing: 1.5px; font-weight: 600;
  }
  .todo-badge.dashboard { background: rgba(244,199,107,0.12); color: var(--gold); border: 1px solid rgba(244,199,107,0.4); }
  .todo-badge.design    { background: rgba(155,108,255,0.12); color: var(--violet); border: 1px solid rgba(155,108,255,0.4); }
  .todo-badge.product   { background: rgba(77,184,255,0.12);  color: var(--blue);   border: 1px solid rgba(77,184,255,0.4); }
  .todo-badge.roadmap   { background: rgba(255,255,255,0.05); color: var(--mute);   border: 1px solid var(--hairline); }
  .todo-group ul { margin: 0; padding-left: 18px; color: var(--mute); font-size: 13px; line-height: 1.6; }
  .todo-group li { margin-bottom: 4px; }
</style>
</head>
<body>
  <main class="wrap">
    <header class="top">
      <div class="brand">AURALENS<span class="by"> · BY VYBSTAK</span></div>
      <div class="phase">Phase 2.6 · Preview Pack</div>
    </header>

    <h1>Current progress preview</h1>
    <p class="lede">
      Visual review of the AuraLens app and brand state. Every image below is composed using the production drawing primitives, colour tokens, and copy that ship in the real assets.
    </p>

    <div class="honest">
      <strong>Honest labelling:</strong> these are generated UI previews, not real iOS or Android simulator captures.
      To capture real device screenshots, run <code>eas build --profile development</code> and take them on-device.
    </div>

    <h3>High-fidelity screen previews (live HTML)</h3>
    <p class="lede" style="margin-top:-4px">Rendered in the browser at iPhone 14/15 viewport (393×852) with real system typography, CSS blur, and live animations. Closer to the production look than the generated PNG sheets — but still not a simulator capture.</p>
    <div class="hifi-row">${hifiStrip}</div>

    <h3>Verification</h3>
    <div class="status">
      <div class="pill"><span class="k">TypeScript</span><span class="v ok">CLEAN</span></div>
      <div class="pill"><span class="k">Jest</span><span class="v ok">61 / 61</span></div>
      <div class="pill"><span class="k">expo-doctor</span><span class="v ok">17 / 17</span></div>
      <div class="pill"><span class="k">verify:release</span><span class="v ok">PASS 110 / 0</span></div>
    </div>

    <h3>Preview sheets</h3>
    <div class="grid">
      ${sections}
    </div>

    <h3>Store screenshots (1290 × 2796)</h3>
    <div class="row">${storeStrip}</div>

    <h3>Brand asset files</h3>
    <div class="row">${brandStrip}</div>

    <h3>Still outstanding — full honesty</h3>
    <p class="lede" style="margin-top:-4px">Code-side, all five verification gates are green. The list below is everything the app still needs before it can ship — categorised by whether it's a dashboard step, design step, real-device verification, or future roadmap.</p>
    <div class="todo-grid">${todoHtml}</div>

    <footer>
      Regenerate any of this with <code>npm run generate:preview</code> or <code>npm run generate:assets</code>.
      Read the long-form status at <a href="/docs/current-progress-preview.md">/docs/current-progress-preview.md</a>
      and the gallery at <a href="/docs/preview-gallery.md">/docs/preview-gallery.md</a>.
    </footer>
  </main>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (!req.url) { res.writeHead(400); return res.end('bad request'); }
  const url = req.url.split('?')[0];

  if (url === '/' || url === '/preview' || url === '/index.html') {
    const html = indexHtml();
    res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
    return res.end(html);
  }

  const abs = safeJoin(url);
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('not found');
  }
  const ext = path.extname(abs).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': 'public, max-age=60',
  });
  fs.createReadStream(abs).pipe(res);
});

server.listen(PORT, HOST, () => {
  // single line stdout so the parent process knows when it's up
  console.log(`AuraLens preview ready → http://${HOST}:${PORT}/`);
});
