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
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
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
console.log();
if (!fs.existsSync(envPath)) {
  console.log(`Tip: copy a template and fill it.`);
  console.log(`  cp .env.development.example .env`);
  console.log();
  process.exit(0);
}
