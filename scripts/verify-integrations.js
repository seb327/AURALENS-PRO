#!/usr/bin/env node
/*
 * Structural integration verifier.
 *
 *   npm run verify:integrations
 *   npm run verify:integrations -- --live=production    # require live secrets
 *   npm run verify:integrations -- --live=preview
 *
 * Without --live, this verifier checks structure only:
 *   - env templates expose every expected public variable
 *   - app.config.ts wires every expected extra slot
 *   - SQL migrations contain every required table + RLS policy
 *   - edge functions reference the required pipeline steps
 *   - product IDs in constants match the documented sandbox products
 *   - bundle IDs are consistent across app.config + eas.json + docs
 *   - no server-only LLM keys leak into client code
 *   - dev mode always labels mock/fallback paths
 *
 * With --live=<profile>, it additionally requires that the matching
 * .env.<profile> file contains real values for the public secrets.
 *
 * The verifier never reads real secrets to disk; it only checks that the
 * shape is correct. Real round-trip tests live in the device-smoke doc.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const liveArg = args.find((a) => a.startsWith('--live='));
const LIVE_PROFILE = liveArg ? liveArg.split('=')[1] : null;

// ─── JWT-role guard ──────────────────────────────────────────────────────────
// Anything in a *.env file under an EXPO_PUBLIC_* slot will be bundled into
// the mobile binary and shipped to every device. If a Supabase JWT in such a
// slot carries the `service_role` claim, the database's RLS is fully bypassed
// for every user that downloads the app. This guard refuses to let that ship.

function decodeJwtPayload(jwt) {
  if (typeof jwt !== 'string' || !jwt.startsWith('eyJ') || jwt.split('.').length !== 3) {
    return null;
  }
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch { return null; }
}

const FORBIDDEN_PUBLIC_VALUES = [
  // Substring matches that must never appear in an EXPO_PUBLIC_* value.
  // (We can't blanket-ban "sk-" because that would catch legitimate tokens
  // — these are exact server-only credential patterns.)
  { name: 'Anthropic API key',         re: /^sk-ant-/ },
  { name: 'OpenAI API key',            re: /^sk-(?:proj-|svcacct-|None-)?[A-Za-z0-9]{40,}/ },
  { name: 'Stripe secret key',         re: /^sk_(?:test|live)_[A-Za-z0-9]{16,}/ },
  { name: 'Stripe restricted key',     re: /^rk_(?:test|live)_[A-Za-z0-9]{16,}/ },
  { name: 'Stripe webhook secret',     re: /^whsec_[A-Za-z0-9]{16,}/ },
];
// Note: Stripe PUBLISHABLE keys (`pk_test_…` / `pk_live_…`) are SAFE in
// EXPO_PUBLIC_* slots — they're designed to ship to clients. Do not add them
// to the forbidden list.

function scanEnvForLeaks(envFile, txt) {
  const findings = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    if (!value) continue;
    if (!key.startsWith('EXPO_PUBLIC_')) continue; // we only police public slots here

    // JWT role check
    const payload = decodeJwtPayload(value);
    if (payload && payload.role && payload.role !== 'anon') {
      findings.push(`SECURITY: ${envFile} ${key} contains a JWT with role="${payload.role}". ` +
        `Only role="anon" is safe in EXPO_PUBLIC_* slots. ` +
        `Service-role keys go on the EDGE FUNCTION via "supabase secrets set", never in any .env loaded by Expo.`);
    }

    // Direct LLM-key check
    for (const f of FORBIDDEN_PUBLIC_VALUES) {
      if (f.re.test(value)) {
        findings.push(`SECURITY: ${envFile} ${key} looks like an ${f.name}. Server-only — must NOT be in any EXPO_PUBLIC_* slot.`);
      }
    }
  }
  return findings;
}

const pass = [];
const fail = [];
const warn = [];
const ok = (m) => pass.push(m);
const bad = (m) => fail.push(m);
const wn = (m) => warn.push(m);

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ── 1. Required public env vars in templates ─────────────────────────────
const REQUIRED_PUBLIC_VARS = [
  'APP_DISPLAY_NAME',
  'APP_SLUG',
  'IOS_BUNDLE_ID',
  'ANDROID_PACKAGE',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'REVENUECAT_IOS_KEY',
  'REVENUECAT_ANDROID_KEY',
];
const SERVER_ONLY_VARS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_PROVIDER', 'AI_MODEL'];

for (const f of ['.env.example', '.env.development.example', '.env.preview.example', '.env.production.example']) {
  if (!exists(f)) { bad(`Missing env template: ${f}`); continue; }
  const txt = read(f);
  for (const v of REQUIRED_PUBLIC_VARS) {
    if (!new RegExp(`^${v}=`, 'm').test(txt)) bad(`${f} missing ${v}`);
  }
  ok(`Env template scanned: ${f}`);
}

// ── 1b. Scan actual .env files (if present) for JWT-role leaks ──────────────
// Templates are never expected to contain secrets, but the real .env / .env.<profile>
// loaded by Expo MUST NOT have a service_role JWT or LLM key in any EXPO_PUBLIC_* slot.
for (const f of ['.env', '.env.local', '.env.development', '.env.preview', '.env.production']) {
  if (!exists(f)) continue;
  const findings = scanEnvForLeaks(f, read(f));
  if (findings.length === 0) { ok(`Env file safe: ${f}`); continue; }
  for (const finding of findings) bad(finding);
}

// ── 1c. Inspect the rendered Expo public config via `npx expo config` ──────
// This is the bytes that actually ship in the binary. Anything sensitive here
// is a build-time leak. Only checked if `node_modules/expo` is installed.
try {
  if (exists('node_modules/expo/package.json')) {
    const { execSync } = require('node:child_process');
    const out = execSync('npx --no-install expo config --type public --json', {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    const cfg = JSON.parse(out);
    const extra = cfg?.extra ?? {};
    const stringValues = (obj) => {
      const out = [];
      const walk = (v) => {
        if (typeof v === 'string') out.push(v);
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
      };
      walk(obj);
      return out;
    };
    let leakCount = 0;
    for (const v of stringValues(cfg)) {
      const payload = decodeJwtPayload(v);
      if (payload?.role && payload.role !== 'anon') {
        bad(`SECURITY: Rendered Expo config contains a JWT with role="${payload.role}". This will ship to every device.`);
        leakCount++;
      }
      for (const f of FORBIDDEN_PUBLIC_VALUES) {
        if (f.re.test(v)) {
          bad(`SECURITY: Rendered Expo config contains a string matching ${f.name}. This will ship to every device.`);
          leakCount++;
        }
      }
    }
    if (leakCount === 0) ok(`Rendered Expo public config: no server-only secrets detected (extra keys: ${Object.keys(extra).join(', ')})`);
  }
} catch (e) {
  // Non-fatal — `expo config` may not run in CI without a full install.
  wn(`Skipped rendered-config scan: ${(e && e.message) ? e.message.split('\n')[0] : e}`);
}

// ── 2. .env.example documents server-only LLM vars distinctly ─────────────
const exTxt = read('.env.example');
for (const v of SERVER_ONLY_VARS) {
  if (!exTxt.includes(v)) wn(`.env.example does not mention server-only var ${v}`);
  else ok(`Server-only var documented: ${v}`);
}

// ── 3. app.config.(js|ts) exposes every public extra ────────────────────
const appCfgPath = exists('app.config.js') ? 'app.config.js'
  : exists('app.config.ts') ? 'app.config.ts'
  : null;
if (!appCfgPath) bad('Missing app.config — neither app.config.js nor app.config.ts found');
const appCfg = appCfgPath ? read(appCfgPath) : '';
const EXTRA_MAP = {
  'appDisplayName':       /APP_DISPLAY_NAME/,
  'supabaseUrl':          /EXPO_PUBLIC_SUPABASE_URL/,
  'supabaseAnonKey':      /EXPO_PUBLIC_SUPABASE_ANON_KEY/,
  'revenueCatIosKey':     /REVENUECAT_IOS_KEY/,
  'revenueCatAndroidKey': /REVENUECAT_ANDROID_KEY/,
};
for (const [key, re] of Object.entries(EXTRA_MAP)) {
  if (!appCfg.includes(key) || !re.test(appCfg)) bad(`${appCfgPath} missing extra: ${key}`);
  else ok(`${appCfgPath} extra wired: ${key}`);
}

// ── 4. SQL migrations + RLS ──────────────────────────────────────────────
const REQUIRED_TABLES = ['profiles', 'readings', 'reading_images', 'entitlement_snapshots', 'ai_buddy_messages'];
const schema = read('supabase/migrations/001_initial_schema.sql');
const rls = read('supabase/migrations/002_rls_policies.sql');
for (const t of REQUIRED_TABLES) {
  const re = new RegExp(`create\\s+table\\s+(?:if not exists\\s+)?public\\.${t}\\b`, 'i');
  if (!re.test(schema)) bad(`Migration missing table: ${t}`);
  else ok(`Schema has table: ${t}`);
  const rlsRe = new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, 'i');
  if (!rlsRe.test(rls)) bad(`RLS not enabled on: ${t}`);
  else ok(`RLS enabled on: ${t}`);
}
if (!/reading-images/.test(rls)) bad('RLS policy does not reference reading-images bucket');
else ok('Storage bucket policies present');

// ── 5. Edge functions cover the pipeline ─────────────────────────────────
const reqFns = [
  'supabase/functions/ai-buddy/index.ts',
  'supabase/functions/_shared/aiProvider.ts',
  'supabase/functions/_shared/crisisGuardrail.ts',
  'supabase/functions/_shared/rateLimit.ts',
  'supabase/functions/_shared/cors.ts',
  'supabase/functions/_shared/buddyTypes.ts',
  'supabase/functions/reconcile-entitlements/index.ts',
];
for (const f of reqFns) {
  if (!exists(f)) bad(`Missing edge function file: ${f}`);
  else ok(`Edge function file: ${f}`);
}
const aiBuddy = read('supabase/functions/ai-buddy/index.ts');
const PIPELINE = [
  ['rejectIfForbiddenKeys', 'forbidden-key rejection'],
  ['auth.getUser',           'JWT user lookup'],
  ['entitlement_snapshots',  'monthly entitlement check'],
  ['checkRateLimit',         'rate limit'],
  ['detectCrisis',           'crisis guardrail'],
  ['callProvider',           'LLM call'],
  ['ai_buddy_messages',      'message persistence'],
  ['shapeFinalResponse',     'response shaper'],
];
for (const [needle, label] of PIPELINE) {
  if (!aiBuddy.includes(needle)) bad(`ai-buddy missing pipeline step: ${label}`);
  else ok(`ai-buddy pipeline step: ${label}`);
}

// ── 6. Product IDs are consistent ────────────────────────────────────────
const products = read('constants/products.ts');
const EXPECTED_PRODUCT_IDS = ['auralens_instant_reading_199', 'auralens_monthly_799'];
for (const p of EXPECTED_PRODUCT_IDS) {
  if (!products.includes(`'${p}'`)) bad(`constants/products.ts missing product ID: ${p}`);
  else ok(`Product ID present: ${p}`);
}
const ENTITLEMENT_ID = 'monthly';
if (!new RegExp(`monthly:\\s*['"]${ENTITLEMENT_ID}['"]`).test(products)) {
  bad('constants/products.ts ENTITLEMENTS.monthly !== "monthly"');
} else ok('Entitlement id "monthly" present');

// ── 7. Bundle IDs consistent across files ────────────────────────────────
const bundleRe = /com\.vybstak\.auralens(?:\.\w+)?/g;
const expectedBundle = 'com.vybstak.auralens';
const filesToCheck = [appCfgPath, 'eas.json', '.env.example', '.env.development.example', '.env.preview.example', '.env.production.example'].filter(Boolean);
for (const f of filesToCheck) {
  if (!exists(f)) continue;
  const txt = read(f);
  const matches = txt.match(bundleRe) ?? [];
  if (matches.length === 0) {
    // eas.json doesn't have to mention bundle ids
    if (f.endsWith('eas.json')) continue;
    bad(`${f} does not reference ${expectedBundle}`);
    continue;
  }
  const valid = matches.every((m) => m === expectedBundle || m.startsWith(`${expectedBundle}.`));
  if (!valid) bad(`${f} has inconsistent bundle id: ${matches.join(', ')}`);
  else ok(`Bundle ID consistent in: ${f}`);
}

// ── 8. No server-only LLM keys in client code ────────────────────────────
const CLIENT_DIRS = ['app', 'components', 'constants', 'engine', 'services', 'store', 'types'];
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '__tests__') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(t|j)sx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const SECRET_NAMES = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
let scanned = 0;
for (const d of CLIENT_DIRS) {
  for (const f of walk(path.join(ROOT, d))) {
    scanned++;
    const txt = fs.readFileSync(f, 'utf8');
    for (const k of SECRET_NAMES) {
      if (txt.includes(k)) bad(`Server-only key "${k}" referenced in client file ${path.relative(ROOT, f)}`);
    }
  }
}
ok(`Scanned ${scanned} client files for server-only key leaks`);

// ── 9. Dev / fallback paths are labelled ─────────────────────────────────
const labels = [
  { file: 'app/pricing.tsx', needle: 'is not configured', label: 'pricing dev banner' },
  { file: 'services/aiBuddyService.ts', needle: 'fallback', label: 'aiBuddyService fallback path' },
  { file: 'services/purchaseService.ts', needle: 'local-dev', label: 'purchaseService dev outcome' },
  { file: 'services/revenueCatService.ts', needle: 'not configured', label: 'RC stub message' },
  { file: 'services/supabase.ts', needle: 'local-first', label: 'supabase comment' },
];
for (const l of labels) {
  if (!exists(l.file)) { bad(`Missing ${l.file}`); continue; }
  if (!read(l.file).includes(l.needle)) bad(`${l.label} missing labelling needle: "${l.needle}"`);
  else ok(`Dev path labelled: ${l.label}`);
}

// ── 10. --live secret presence (optional) ────────────────────────────────
if (LIVE_PROFILE) {
  const envFile = `.env.${LIVE_PROFILE}`;
  if (!exists(envFile)) {
    bad(`--live=${LIVE_PROFILE} requested but ${envFile} not present`);
  } else {
    const txt = read(envFile);
    const liveRequired = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'REVENUECAT_IOS_KEY',
      'REVENUECAT_ANDROID_KEY',
    ];
    for (const v of liveRequired) {
      const re = new RegExp(`^${v}=(.+)$`, 'm');
      const m = txt.match(re);
      if (!m || !m[1].trim() || /your-/.test(m[1]) || /xxx/.test(m[1]) || m[1].trim().endsWith('=')) {
        bad(`${envFile} ${v} looks unset / placeholder`);
      } else {
        ok(`${envFile} has ${v}`);
      }
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────
console.log();
console.log(`PASS ${pass.length}`);
console.log(`WARN ${warn.length}`);
console.log(`FAIL ${fail.length}`);
if (warn.length) { console.log('\nWarnings:'); warn.forEach((w) => console.log('  • ' + w)); }
if (fail.length) {
  console.log('\nFailures:');
  fail.forEach((f) => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log(LIVE_PROFILE
  ? `\nIntegration verification passed (live mode: ${LIVE_PROFILE}).`
  : '\nIntegration verification passed (structural).');
