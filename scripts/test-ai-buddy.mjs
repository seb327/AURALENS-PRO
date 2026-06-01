#!/usr/bin/env node
/**
 * Live smoke test for the deployed `ai-buddy` Supabase edge function.
 *
 * Prereqs:
 *   1. Supabase project deployed (Step 2)
 *   2. ai-buddy function deployed and secrets set (Step 3)
 *   3. A test user in auth.users with auto-confirm ON
 *   4. An entitlement_snapshots row for that user with has_monthly=true
 *
 * Run:
 *   TEST_EMAIL=test@auralens.local TEST_PASSWORD=TestPass-1234 node scripts/test-ai-buddy.mjs
 *
 * Three round-trips:
 *   A. Normal request — should hit Anthropic, get a structured reply
 *   B. Crisis phrase — must short-circuit BEFORE the LLM, return crisis resources
 *   C. Forbidden key — must reject with 400 before any pipeline step
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Tiny .env loader (no dotenv dependency)
function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[2]) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}

const envFile = loadEnv(join(ROOT, '.env'));
const SUPABASE_URL = envFile.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = envFile.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('✗ Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('✗ Set TEST_EMAIL and TEST_PASSWORD env vars');
  console.error('  Example (Git Bash):');
  console.error('    TEST_EMAIL=test@auralens.local TEST_PASSWORD=TestPass-1234 node scripts/test-ai-buddy.mjs');
  console.error('  Example (PowerShell):');
  console.error('    $env:TEST_EMAIL="test@auralens.local"; $env:TEST_PASSWORD="TestPass-1234"; node scripts/test-ai-buddy.mjs');
  process.exit(1);
}

// 1. Sign in via the public auth API directly (no SDK dep)
console.log(`\n→ Signing in as ${TEST_EMAIL}`);
const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    apikey: SUPABASE_ANON,
  },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
const signIn = await signInRes.json();
if (!signInRes.ok || !signIn.access_token) {
  console.error(`✗ Sign in failed (${signInRes.status}):`, JSON.stringify(signIn, null, 2));
  process.exit(1);
}
const userId = signIn.user?.id;
console.log(`✓ Signed in — user id: ${userId}`);

const FN_URL = `${SUPABASE_URL}/functions/v1/ai-buddy`;
const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${signIn.access_token}`,
};

async function callBuddy(label, payload) {
  console.log(`\n─── ${label} ───`);
  const t0 = Date.now();
  const res = await fetch(FN_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
  const ms = Date.now() - t0;
  let body;
  try { body = await res.json(); } catch { body = await res.text(); }
  console.log(`status: ${res.status}  time: ${ms}ms`);
  console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  return { status: res.status, body };
}

// A. Normal request
const a = await callBuddy('A. Normal request (should hit Anthropic)', {
  message: 'I have felt scattered all week. What does my reading suggest?',
  context: {
    reading: {
      readingId: 'test-1',
      label: 'Rising Aura',
      score: 74,
      confidence: 80,
      dominantColour: 'Gold',
      secondaryColour: 'Violet',
      element: 'Fire',
      zoneScores: { forehead: 78, brows: 68, eyes: 71, nose: 70, cheeks: 62, mouth: 60, chinJaw: 58 },
      guidanceSummary: 'Strong forward movement with light tension around grounding.',
    },
  },
});

// B. Crisis short-circuit
const b = await callBuddy('B. Crisis phrase (must NOT call the LLM)', {
  message: 'i want to die',
});

// C. Forbidden key
const c = await callBuddy('C. Forbidden key (must reject 400)', {
  message: 'hi',
  photoBase64: 'AAAA',
});

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════');
console.log('Verdict');
console.log('══════════════════════════════════════════════════════════════════');

const okA = a.status === 200 && !!a.body?.reply && !!a.body?.disclaimer && a.body?.crisisDetected === false;
const okB = b.status === 200
  && b.body?.crisisDetected === true
  && /emergency|samaritans|988|crisis|hotline|999|112|lifeline/i.test(String(b.body?.reply ?? ''));
const okC = c.status === 400 && /not allowed/i.test(String(c.body?.error ?? ''));

// Detailed reason output so failures are diagnosable without re-reading the JSON.
function whyA(r) {
  if (r.status !== 200) return `status=${r.status}`;
  if (!r.body?.reply) return 'missing reply field';
  if (!r.body?.disclaimer) return 'missing disclaimer field';
  if (r.body?.crisisDetected !== false) return `crisisDetected=${r.body?.crisisDetected}`;
  return 'ok';
}
function whyB(r) {
  if (r.status !== 200) return `status=${r.status}`;
  if (r.body?.crisisDetected !== true) return `crisisDetected=${r.body?.crisisDetected}`;
  if (!/emergency|samaritans|988|crisis|hotline|999|112|lifeline/i.test(String(r.body?.reply ?? ''))) {
    return 'crisis resources not found in reply';
  }
  return 'ok';
}
function whyC(r) {
  if (r.status !== 400) return `status=${r.status}`;
  if (!/not allowed/i.test(String(r.body?.error ?? ''))) return 'error text does not match';
  return 'ok';
}

console.log(`A. Normal:      ${okA ? '✓ PASS' : '✗ FAIL'}   reason=${whyA(a)}`);
console.log(`B. Crisis:      ${okB ? '✓ PASS' : '✗ FAIL'}   reason=${whyB(b)}`);
console.log(`C. Forbidden:   ${okC ? '✓ PASS' : '✗ FAIL'}   reason=${whyC(c)}`);

const allOk = okA && okB && okC;
console.log(`\nLive AI Buddy: ${allOk ? '✓ WORKING' : '✗ NEEDS ATTENTION'}`);
process.exit(allOk ? 0 : 1);
