#!/usr/bin/env node
// AuraLens smoke driver.
//
// Pure-node, no deps. Drives the deployed AuraLens app via its HTTP
// surface — the web bundle, the static assets, the Railway API
// endpoints (/health, /redeem, /checkout/session, /ai-buddy,
// /webhook/stripe), and the Supabase auth API the client talks to.
//
// Why this and not a browser? AuraLens is an Expo-React-Native app
// compiled to web. Every interactive flow (sign-in → redeem → scan →
// reading) is HTTP underneath. The DOM render is a useful sanity
// check but the BUGS live at the API layer — every regression we
// shipped in this codebase showed up as a 4xx/5xx from one of these
// endpoints before it ever became a visible UI problem. So the
// driver hits the API layer first. For visual verification on a
// proper Linux box, see the chromium-cli heredoc in SKILL.md.
//
// Usage:
//   node driver.mjs                 # full smoke (local + remote)
//   node driver.mjs --remote        # remote only (default URL)
//   node driver.mjs --url https://… # remote, custom URL
//   node driver.mjs --local         # local dev server only (port 8090)
//   node driver.mjs --verbose       # show response bodies

const args = new Set(process.argv.slice(2));
const verbose = args.has('--verbose') || args.has('-v');
const urlFlag = process.argv.indexOf('--url');
const REMOTE = urlFlag >= 0
  ? process.argv[urlFlag + 1]
  : 'https://auralens-pro-production.up.railway.app';
const LOCAL = 'http://localhost:8090';
const SUPABASE_URL = 'https://sefdudrjobjyyygabzhg.supabase.co';
// Publishable (anon) key — safe to commit. Same value the JS bundle carries.
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CE_mFrl_jJ8qeu4hjrMsKQ_D2XxQKtW';

const runLocal = args.has('--local');
const runRemote = !runLocal || args.has('--remote');

const TIMEOUT_MS = 20000;

function color(c, s) {
  const codes = { red: 31, green: 32, yellow: 33, blue: 34, gray: 90, bold: 1 };
  return `\x1b[${codes[c] ?? 0}m${s}\x1b[0m`;
}

async function timed(label, fn) {
  const t0 = Date.now();
  try {
    const r = await fn();
    const dt = Date.now() - t0;
    const ok = r?.ok ?? true;
    const status = r?.status ?? '-';
    console.log(
      `${ok ? color('green', 'PASS') : color('red', 'FAIL')} ` +
      `${label.padEnd(48, ' ')} ${color('gray', `${status} ${dt}ms`)}`,
    );
    if (verbose && r?.body !== undefined) {
      const s = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
      console.log(color('gray', `       ↳ ${s.slice(0, 240)}${s.length > 240 ? '…' : ''}`));
    }
    return ok;
  } catch (e) {
    console.log(`${color('red', 'FAIL')} ${label.padEnd(48, ' ')} ${color('red', e.message)}`);
    return false;
  }
}

async function http(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeout ?? TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('application/json')
      ? await res.json().catch(() => null)
      : await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body, headers: res.headers };
  } finally { clearTimeout(t); }
}

async function smokeBase(base, label) {
  console.log('\n' + color('bold', `── ${label} (${base}) ──`));
  const results = [];

  // 1. Server is up
  results.push(await timed('GET /health', async () => {
    const r = await http(`${base}/health`);
    const okFlags = r.body?.ok
      && r.body?.supabase === true
      && r.body?.stripe?.stripe === true
      && r.body?.stripe?.webhook === true
      && r.body?.stripe?.prices === true;
    return { ok: r.ok && okFlags, status: r.status, body: r.body };
  }));

  // 2. Root serves the Expo web bundle (HTML), not just JSON
  results.push(await timed('GET /  → HTML web bundle', async () => {
    const r = await http(base);
    const ct = r.headers.get('content-type') || '';
    const isHtml = ct.startsWith('text/html');
    const hasTitle = typeof r.body === 'string' && r.body.includes('<title>AuraLens</title>');
    return { ok: r.ok && isHtml && hasTitle, status: r.status, body: ct };
  }));

  // 3. JS bundle is reachable + non-trivial
  results.push(await timed('GET entry-*.js  → > 1 MB', async () => {
    const root = await http(base);
    const m = (typeof root.body === 'string' ? root.body : '').match(/\/_expo\/static\/js\/web\/entry-[a-f0-9]+\.js/);
    if (!m) return { ok: false, status: 'no entry-*.js link', body: null };
    const r = await http(`${base}${m[0]}`);
    const size = Number(r.headers.get('content-length') || 0);
    return { ok: r.ok && size > 1_000_000, status: r.status, body: `${(size/1024/1024).toFixed(2)} MB` };
  }));

  // 4. The new shader code is in the served bundle (regression guard)
  results.push(await timed('Bundle contains shader uniforms', async () => {
    const root = await http(base);
    const m = (typeof root.body === 'string' ? root.body : '').match(/\/_expo\/static\/js\/web\/entry-[a-f0-9]+\.js/);
    if (!m) return { ok: false, status: 'no bundle' };
    const r = await http(`${base}${m[0]}`);
    const txt = typeof r.body === 'string' ? r.body : '';
    const hasUniforms = txt.includes('u_velocity') && txt.includes('u_energy') && txt.includes('u_scroll');
    const hasFonts = txt.includes('Fraunces');
    return { ok: hasUniforms && hasFonts, status: hasUniforms ? (hasFonts ? 'shader+fonts' : 'shader only') : 'missing' };
  }));

  // 5. Stripe checkout requires auth → 401, not 502 (server crash-proof)
  results.push(await timed('POST /checkout/session (no auth)  → 401', async () => {
    const r = await http(`${base}/checkout/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'single', returnUrl: `${base}/` }),
    });
    return { ok: r.status === 401, status: r.status, body: r.body };
  }));

  // 6. Same for redeem
  results.push(await timed('POST /redeem (no auth)  → 401', async () => {
    const r = await http(`${base}/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'AURAVIP' }),
    });
    return { ok: r.status === 401, status: r.status, body: r.body };
  }));

  // 7. Garbage token doesn't crash either endpoint
  results.push(await timed('POST /checkout/session (bad JWT)  → 401', async () => {
    const r = await http(`${base}/checkout/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer garbage' },
      body: JSON.stringify({ productId: 'single', returnUrl: `${base}/` }),
    });
    return { ok: r.status === 401, status: r.status, body: r.body };
  }));

  // 8. Stripe webhook rejects unsigned bodies cleanly
  results.push(await timed('POST /webhook/stripe (no sig)  → 400', async () => {
    const r = await http(`${base}/webhook/stripe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'evt_test' }),
    });
    return { ok: r.status === 400, status: r.status, body: r.body };
  }));

  return results.every(Boolean);
}

async function smokeSupabase() {
  console.log('\n' + color('bold', `── Supabase (${SUPABASE_URL}) ──`));
  const results = [];
  // Auth API responds to /auth/v1/health with the GoTrue banner
  results.push(await timed('GET /auth/v1/health  → GoTrue', async () => {
    const r = await http(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    });
    const ok = r.ok && (r.body?.name === 'GoTrue' || (typeof r.body === 'string' && r.body.includes('GoTrue')));
    return { ok, status: r.status, body: r.body };
  }));
  return results.every(Boolean);
}

(async () => {
  console.log(color('bold', `AuraLens smoke driver  ${new Date().toISOString()}`));
  let ok = true;
  if (runRemote) ok = (await smokeBase(REMOTE, 'REMOTE')) && ok;
  if (runLocal) ok = (await smokeBase(LOCAL, 'LOCAL DEV')) && ok;
  if (runRemote) ok = (await smokeSupabase()) && ok;
  console.log('\n' + (ok ? color('green', '✓ all green') : color('red', '✗ failures above')));
  process.exit(ok ? 0 : 1);
})();
