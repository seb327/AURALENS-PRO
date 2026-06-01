#!/usr/bin/env node
/*
 * Loads .env (or .env.<profile>) and prints which mode each subsystem will
 * run in. No secrets are printed — only "configured" / "fallback" labels.
 *
 *   npm run smoke:config
 *   npm run smoke:config -- --profile=preview
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const profileArg = args.find((a) => a.startsWith('--profile='));
const profile = profileArg ? profileArg.split('=')[1] : null;
const envFile = profile ? `.env.${profile}` : '.env';
const envPath = path.join(ROOT, envFile);

const env = {};
const securityWarnings = [];

function decodeJwtRole(jwt) {
  if (typeof jwt !== 'string' || !jwt.startsWith('eyJ') || jwt.split('.').length !== 3) return null;
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')).role ?? null;
  } catch { return null; }
}

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    env[k] = v.trim();

    // Guardrail: any JWT in an EXPO_PUBLIC_* slot must have role="anon".
    if (k.startsWith('EXPO_PUBLIC_')) {
      const role = decodeJwtRole(env[k]);
      if (role && role !== 'anon') {
        securityWarnings.push(`⚠  ${envFile} ${k} contains a JWT with role="${role}". Only role="anon" belongs in EXPO_PUBLIC_* slots.`);
      }
      if (/^sk-ant-/.test(env[k]) || /^sk-(?:proj-|svcacct-|None-)?[A-Za-z0-9]{40,}/.test(env[k])) {
        securityWarnings.push(`⚠  ${envFile} ${k} looks like an LLM API key. Server-only — never EXPO_PUBLIC_*.`);
      }
      if (/^sk_(?:test|live)_[A-Za-z0-9]{16,}/.test(env[k])) {
        securityWarnings.push(`⚠  ${envFile} ${k} looks like a Stripe SECRET key. Stripe secrets belong on Railway, never EXPO_PUBLIC_*.`);
      }
      if (/^whsec_[A-Za-z0-9]{16,}/.test(env[k])) {
        securityWarnings.push(`⚠  ${envFile} ${k} looks like a Stripe WEBHOOK secret. Belongs on Railway only.`);
      }
    }
  }
}

const has = (k) => Boolean(env[k] && env[k].length > 0 && !/^your-/.test(env[k]) && env[k] !== 'xxx');

const subsystems = [
  {
    name: 'App identity',
    mode: env.APP_DISPLAY_NAME ?? 'AuraLens',
    detail: `bundle=${env.IOS_BUNDLE_ID ?? '(default)'} pkg=${env.ANDROID_PACKAGE ?? '(default)'}`,
  },
  {
    name: 'Supabase',
    mode: has('EXPO_PUBLIC_SUPABASE_URL') && has('EXPO_PUBLIC_SUPABASE_ANON_KEY') ? 'LIVE' : 'LOCAL-FIRST (no cloud sync, no edge functions)',
    detail: has('EXPO_PUBLIC_SUPABASE_URL') ? 'url + anon key present' : 'no url/anon key — sync hidden in Settings',
  },
  {
    name: 'RevenueCat (iOS)',
    mode: has('REVENUECAT_IOS_KEY') ? 'LIVE SDK' : 'MOCK (simulated purchases)',
    detail: has('REVENUECAT_IOS_KEY') ? 'key present, dev-build will use react-native-purchases' : 'no key — mock unlocks in dev',
  },
  {
    name: 'RevenueCat (Android)',
    mode: has('REVENUECAT_ANDROID_KEY') ? 'LIVE SDK' : 'MOCK (simulated purchases)',
    detail: has('REVENUECAT_ANDROID_KEY') ? 'key present' : 'no key — mock unlocks in dev',
  },
  {
    name: 'AI Aura Buddy',
    mode: has('EXPO_PUBLIC_SUPABASE_URL') ? 'EDGE FUNCTION (configure provider with `supabase secrets set`)' : 'LOCAL FALLBACK (deterministic seeded reply)',
    detail: 'LLM keys live on the edge function, never the device',
  },
  {
    name: 'EAS project',
    mode: env.EAS_PROJECT_ID ? 'CONFIGURED' : 'UNCONFIGURED (run `eas init`)',
    detail: env.EAS_PROJECT_ID ? env.EAS_PROJECT_ID : '—',
  },
];

const pad = (s, n) => String(s).padEnd(n);

console.log(`AuraLens config smoke test — ${envFile} ${fs.existsSync(envPath) ? '(loaded)' : '(missing)'}`);
console.log('─'.repeat(78));
for (const s of subsystems) {
  console.log(`  ${pad(s.name, 22)} ${pad(s.mode, 38)} ${s.detail}`);
}
console.log('─'.repeat(78));
const live = subsystems.filter((s) => /LIVE/.test(s.mode) || /CONFIGURED/.test(s.mode)).length;
console.log(`Live subsystems: ${live} / ${subsystems.length}`);

if (securityWarnings.length > 0) {
  console.log();
  console.log('SECURITY:');
  for (const w of securityWarnings) console.log('  ' + w);
  console.log();
  process.exitCode = 2; // signal to CI / caller without throwing
}
console.log();
if (!fs.existsSync(envPath)) {
  console.log(`Tip: copy a template and fill it.`);
  console.log(`  cp .env.development.example .env`);
  console.log();
  process.exit(0);
}
