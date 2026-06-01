#!/usr/bin/env node
// Visual QA — screenshots the deployed AuraLens at desktop + mobile widths.
// Run: node .claude/skills/run-auralens/screenshot.mjs [--url <base>] [--out <dir>]

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const urlFlag = process.argv.indexOf('--url');
const outFlag = process.argv.indexOf('--out');
const BASE = urlFlag >= 0 ? process.argv[urlFlag + 1] : 'https://auralens-pro-production.up.railway.app';
const OUT = resolve(outFlag >= 0 ? process.argv[outFlag + 1] : 'screenshots');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
console.log('AuraLens screenshot QA  →', OUT);

const shots = [
  // Hero — 3 widths so we lock the breakpoints
  { name: 'hero-1728',          url: '/',         vp: { width: 1728, height: 900 }, wait: 2400 },
  { name: 'hero-1440',          url: '/',         vp: { width: 1440, height: 900 }, wait: 2400 },
  { name: 'hero-mobile',        url: '/',         vp: { width: 390,  height: 844 }, wait: 2400 },

  // Every public screen, desktop + mobile
  { name: 'pricing-1440',       url: '/pricing',  vp: { width: 1440, height: 900 }, wait: 2000 },
  { name: 'pricing-mobile',     url: '/pricing',  vp: { width: 390,  height: 844 }, wait: 2000 },

  { name: 'auth-1440',          url: '/auth',     vp: { width: 1440, height: 900 }, wait: 1700 },
  { name: 'auth-mobile',        url: '/auth',     vp: { width: 390,  height: 844 }, wait: 1700 },

  { name: 'scan-1440',          url: '/scan',     vp: { width: 1440, height: 900 }, wait: 1700 },
  { name: 'scan-mobile',        url: '/scan',     vp: { width: 390,  height: 844 }, wait: 1700 },

  { name: 'redeem-1440',        url: '/redeem',   vp: { width: 1440, height: 900 }, wait: 1700 },
  { name: 'redeem-mobile',      url: '/redeem',   vp: { width: 390,  height: 844 }, wait: 1700 },

  { name: 'settings-1440',      url: '/settings', vp: { width: 1440, height: 900 }, wait: 1700 },
  { name: 'settings-mobile',    url: '/settings', vp: { width: 390,  height: 844 }, wait: 1700 },

  { name: 'technology-1440',    url: '/technology',vp:{ width: 1440, height: 900 }, wait: 1700 },
  { name: 'privacy-1440',       url: '/privacy',  vp: { width: 1440, height: 900 }, wait: 1700 },
];

const browser = await chromium.launch();
try {
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: s.vp, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    process.stdout.write(`  ${s.name.padEnd(22, ' ')} ${BASE}${s.url}  `);
    try {
      await page.goto(`${BASE}${s.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      try { await page.waitForSelector('canvas', { timeout: 8000 }); } catch { /* canvas may not exist on some screens */ }
      await page.waitForTimeout(s.wait);
      const file = `${OUT}/${s.name}.png`;
      await page.screenshot({ path: file, fullPage: false });
      console.log('✓');
    } catch (e) {
      console.log('✗', e.message);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
