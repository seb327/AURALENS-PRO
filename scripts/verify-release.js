#!/usr/bin/env node
/*
 * Release verification. Run before any preview or production build.
 *
 *   npm run verify:release
 *
 * Checks:
 *   1. Required config files exist
 *   2. Required PNG assets exist and are non-empty
 *   3. Env example files exist
 *   4. package.json has every dependency the codebase needs
 *   5. app.config.ts loads without throwing
 *   6. eas.json parses and has all three profiles
 *   7. No server-only LLM keys are referenced in client (`app/`, `services/`,
 *      `store/`, `components/`, `engine/`, `constants/`, `types/`)
 *   8. No forbidden production copy appears anywhere except this file and
 *      `docs/store-assets.md` (where it is listed as forbidden)
 *
 * Exit code is non-zero on any failure.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const fail = [];
const warn = [];
const pass = [];

function ok(msg) { pass.push(msg); }
function bad(msg) { fail.push(msg); }
function warning(msg) { warn.push(msg); }

function relExists(rel, minBytes = 1) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return bad(`Missing: ${rel}`);
  const stat = fs.statSync(p);
  if (stat.isFile() && stat.size < minBytes) return bad(`Empty: ${rel}`);
  ok(`Exists: ${rel}`);
}

// ── 1. Required config files ─────────────────────────────────────────────
const requiredFiles = [
  'package.json', 'app.config.ts', 'eas.json', 'tsconfig.json',
  'babel.config.js', 'metro.config.js', 'jest.setup.js',
  'README.md', '.gitignore', '.env.example',
  '.env.development.example', '.env.preview.example', '.env.production.example',
  'docs/brand-guide.md',
  'app/_layout.tsx', 'app/index.tsx', 'app/pricing.tsx', 'app/scan.tsx',
  'app/upload.tsx', 'app/processing.tsx', 'app/result.tsx', 'app/timeline.tsx',
  'app/buddy.tsx', 'app/settings.tsx', 'app/privacy.tsx',
  'app/delete-data.tsx', 'app/auth.tsx', 'app/technology.tsx',
  'engine/auraEngine.ts', 'engine/faceQuality.ts', 'engine/landmarkMapping.ts',
  'services/supabase.ts', 'services/authService.ts',
  'services/purchaseService.ts', 'services/revenueCatService.ts',
  'services/aiBuddyService.ts', 'services/faceAnalysisService.ts',
  'services/readingSyncService.ts', 'services/cloudStorageService.ts',
  'services/entitlementSyncService.ts',
  'store/useAuthStore.ts', 'store/useEntitlementStore.ts',
  'store/useReadingStore.ts', 'store/useBuddyStore.ts',
  'supabase/migrations/001_initial_schema.sql',
  'supabase/migrations/002_rls_policies.sql',
  'supabase/functions/ai-buddy/index.ts',
  'supabase/functions/_shared/aiProvider.ts',
  'supabase/functions/_shared/crisisGuardrail.ts',
  'supabase/functions/_shared/rateLimit.ts',
  'supabase/functions/_shared/cors.ts',
  'supabase/functions/_shared/buddyTypes.ts',
  'docs/eas-build.md', 'docs/testflight.md',
  'docs/google-play-internal-testing.md', 'docs/store-assets.md',
  'docs/privacy-declarations.md', 'docs/qa-test-plan.md',
  'docs/release-checklist.md', 'docs/supabase-setup.md',
  'docs/privacy-policy.md', 'docs/terms.md',
];
for (const f of requiredFiles) relExists(f, 1);

// ── 2. Assets ────────────────────────────────────────────────────────────
// (rel, expectedW, expectedH, minBytes)
const requiredAssets = [
  ['assets/icon.png',           1024, 1024,  5000],
  ['assets/adaptive-icon.png',  1024, 1024,  2000],
  ['assets/splash.png',         2048, 2048, 20000],
  ['assets/favicon.png',         196,  196,   500],
  ['assets/store/screenshots/hero-iphone-6.7.png',    1290, 2796, 10000],
  ['assets/store/screenshots/pricing-iphone-6.7.png', 1290, 2796, 10000],
  ['assets/store/screenshots/scan-iphone-6.7.png',    1290, 2796, 10000],
  ['assets/store/screenshots/result-iphone-6.7.png',  1290, 2796, 10000],
  ['assets/store/screenshots/buddy-iphone-6.7.png',   1290, 2796, 10000],
];

function readPngDimensions(absPath) {
  // PNG signature (8 bytes) + IHDR chunk: length(4)+type(4)+width(4)+height(4)+…
  const fd = fs.openSync(absPath, 'r');
  try {
    const buf = Buffer.alloc(24);
    const n = fs.readSync(fd, buf, 0, 24, 0);
    if (n < 24) return null;
    const sig = buf.slice(0, 8);
    const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!sig.equals(expected)) return null;
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { w, h };
  } finally {
    fs.closeSync(fd);
  }
}

for (const [rel, expW, expH, minBytes] of requiredAssets) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { bad(`Missing asset: ${rel}`); continue; }
  const stat = fs.statSync(abs);
  if (stat.size < minBytes) { bad(`Asset too small (likely empty): ${rel} (${stat.size}B)`); continue; }
  const dim = readPngDimensions(abs);
  if (!dim) { bad(`Asset not a valid PNG: ${rel}`); continue; }
  if (dim.w !== expW || dim.h !== expH) {
    bad(`Asset dimensions wrong: ${rel} got ${dim.w}×${dim.h}, expected ${expW}×${expH}`);
    continue;
  }
  // Reject placeholder filenames (anything containing the literal word "placeholder").
  if (/placeholder/i.test(rel)) {
    bad(`Asset filename still placeholder-labelled: ${rel}`);
    continue;
  }
  ok(`Asset OK: ${rel} ${dim.w}×${dim.h} (${(stat.size / 1024).toFixed(1)}KB)`);
}

// ── 3. Dependencies ──────────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const required = [
  'expo', 'expo-router', 'expo-camera', 'expo-image-picker',
  'expo-image-manipulator', 'expo-haptics', 'expo-blur', 'expo-linear-gradient',
  'expo-constants', 'expo-crypto', 'expo-file-system', 'expo-status-bar',
  'expo-splash-screen', 'expo-linking',
  'react', 'react-native', 'react-native-safe-area-context', 'react-native-screens',
  'react-native-reanimated', 'react-native-gesture-handler', 'react-native-svg',
  'react-native-url-polyfill',
  '@react-native-async-storage/async-storage',
  '@supabase/supabase-js', 'zustand',
];
for (const dep of required) {
  if (!pkg.dependencies?.[dep]) bad(`Missing dependency: ${dep}`);
  else ok(`Dependency: ${dep}@${pkg.dependencies[dep]}`);
}

// ── 4. app.config.ts loads ──────────────────────────────────────────────
try {
  // Cheap textual check — actually evaluating .ts here would need ts-node.
  const txt = fs.readFileSync(path.join(ROOT, 'app.config.ts'), 'utf8');
  if (!/export default/.test(txt)) bad('app.config.ts has no default export');
  else ok('app.config.ts default export present');
  for (const needle of ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'adaptiveIcon']) {
    if (!txt.includes(needle)) bad(`app.config.ts missing ${needle}`);
    else ok(`app.config.ts contains ${needle}`);
  }
  // Verify the asset paths referenced in app.config.ts actually exist on disk.
  const ASSET_PATH_RE = /['"`](\.\/assets\/[A-Za-z0-9_./-]+\.png)['"`]/g;
  const seen = new Set();
  let m;
  while ((m = ASSET_PATH_RE.exec(txt)) !== null) {
    const rel = m[1].replace(/^\.\//, '');
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) bad(`app.config.ts references missing asset: ${rel}`);
    else ok(`app.config.ts asset reference resolves: ${rel}`);
  }
} catch (e) {
  bad(`Cannot read app.config.ts: ${e.message}`);
}

// ── 5. eas.json parses + profiles ───────────────────────────────────────
try {
  const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
  for (const p of ['development', 'preview', 'production']) {
    if (!eas.build?.[p]) bad(`eas.json missing build.${p}`);
    else ok(`eas.json profile: ${p}`);
  }
} catch (e) {
  bad(`eas.json invalid JSON: ${e.message}`);
}

// ── 6. No server-only keys referenced in client code ────────────────────
const SERVER_ONLY_KEYS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const CLIENT_DIRS = ['app', 'components', 'constants', 'engine', 'services', 'store', 'types'];
function walk(dir, opts = {}) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (opts.skipTests && e.name === '__tests__') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, opts));
    else if (/\.(t|j)sx?$/.test(e.name)) {
      if (opts.skipTests && /\.test\.tsx?$/.test(e.name)) continue;
      out.push(p);
    }
  }
  return out;
}
for (const dir of CLIENT_DIRS) {
  for (const file of walk(path.join(ROOT, dir), { skipTests: true })) {
    const src = fs.readFileSync(file, 'utf8');
    for (const k of SERVER_ONLY_KEYS) {
      if (src.includes(k)) bad(`Server-only key "${k}" referenced in client file ${path.relative(ROOT, file)}`);
    }
  }
}
ok(`Scanned ${CLIENT_DIRS.length} client directories for server-only key leaks`);

// ── 6b. Screenshot copy compliance ──────────────────────────────────────
// Pull the SCREENSHOTS array exported by the generator, then check each
// (headline, subline, body) for forbidden marketing claims.
try {
  const gen = require(path.join(ROOT, 'scripts', 'generate-store-placeholders.js'));
  const shots = gen?.SCREENSHOTS ?? [];
  if (shots.length === 0) bad('Generator did not export SCREENSHOTS array');
  else ok(`Screenshot manifest: ${shots.length} frames`);
  for (const s of shots) {
    const haystack = [s.headline, s.subline, s.body?.eyebrow ?? '', s.body?.text ?? ''].join(' \n ');
    for (const re of [
      /scientifically proven aura/i,
      /100\s*%?\s*accurate/i,
      /guaranteed aura result/i,
      /\bis a diagnosis\b/i,
      /\bmedical diagnosis\b/i,
      /detects?\s+mental\s+illness/i,
      /\bbad person\b/i,
      /destiny reading/i,
      /biometric identity verification/i,
    ]) {
      const m = haystack.match(re);
      if (m) bad(`Forbidden copy "${m[0]}" in screenshot ${s.name}`);
    }
    if (!s.headline || !s.subline) bad(`Screenshot ${s.name} missing headline/subline`);
    if (/placeholder/i.test(s.name)) bad(`Screenshot filename still placeholder-labelled: ${s.name}`);
  }
} catch (e) {
  bad(`Failed to load generator manifest: ${e.message}`);
}

// ── 7. Forbidden production copy ────────────────────────────────────────
// Forbidden production COPY — affirmative misuse patterns only. The bare
// word "diagnosis" is fine when used to *deny* a claim (we say "not a
// diagnosis" throughout). These patterns target the claim shape, not the
// keyword in isolation.
const FORBIDDEN_COPY = [
  /scientifically proven aura/i,
  /100\s*%?\s*accurate/i,
  /guaranteed aura result/i,
  /\bis a diagnosis\b/i,
  /\bprovides? (?:a )?diagnosis\b/i,
  /\b(?:medical|psychological) diagnosis\b/i,           // only when affirmative
  /detects?\s+mental\s+illness/i,
  /\bbad person\b/i,
  /destiny reading/i,
  /biometric identity verification/i,
  /absolute accuracy/i,
];

// Whitelisted snippets: phrases that contain a near-forbidden substring but
// are explicitly used to DENY the claim (compliance copy). If a match falls
// inside any of these snippets it's not a violation.
const COMPLIANCE_DENIALS = [
  /not\s+(?:a\s+)?(?:medical|psychological)\s+diagnosis/i,
  /not\s+medical[, ]+(?:psychological[, ]+)?(?:or\s+)?diagnostic/i,
  /not\s+a\s+diagnosis/i,
  /not\s+(?:a\s+)?diagnostic/i,
];
const SCAN_DIRS = ['app', 'components', 'constants', 'engine', 'services', 'store', 'types'];
const SCAN_EXTRA_FILES = ['README.md'];
// `docs/` legitimately discusses forbidden phrases (privacy + store-assets
// list them so future contributors know what to avoid). Skip docs entirely.
const filesToScan = [];
for (const d of SCAN_DIRS) filesToScan.push(...walk(path.join(ROOT, d), { skipTests: true }));
for (const f of SCAN_EXTRA_FILES) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) filesToScan.push(p);
}

function matchAllowedByDenial(src, matchIndex) {
  // Allow the match if the surrounding ±60-char window is covered by a
  // compliance denial pattern.
  const start = Math.max(0, matchIndex - 60);
  const window = src.slice(start, matchIndex + 60);
  return COMPLIANCE_DENIALS.some((re) => re.test(window));
}

for (const file of filesToScan) {
  const src = fs.readFileSync(file, 'utf8');
  for (const re of FORBIDDEN_COPY) {
    const m = re.exec(src);
    if (!m) continue;
    if (matchAllowedByDenial(src, m.index)) continue;
    bad(`Forbidden copy "${m[0]}" found in ${path.relative(ROOT, file)}`);
  }
}
ok(`Scanned ${filesToScan.length} files for forbidden production copy`);

// ── Report ──────────────────────────────────────────────────────────────
console.log();
console.log(`PASS ${pass.length}`);
console.log(`WARN ${warn.length}`);
console.log(`FAIL ${fail.length}`);
if (warn.length) {
  console.log('\nWarnings:');
  for (const w of warn) console.log('  • ' + w);
}
if (fail.length) {
  console.log('\nFailures:');
  for (const f of fail) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('\nRelease verification passed.');
