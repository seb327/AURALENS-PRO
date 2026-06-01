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
  { name: 'hero-1728',          url: '/',         vp: { width: 1728, height: 768 }, wait: 2200 },
  { name: 'hero-1440',          url: '/',         vp: { width: 1440, height: 900 }, wait: 2200 },
  { name: 'hero-mobile',        url: '/',         vp: { width: 390,  height: 844 }, wait: 2200 },
  { name: 'pricing-1440',       url: '/pricing',  vp: { width: 1440, height: 900 }, wait: 2000 },
  { name: 'pricing-mobile',     url: '/pricing',  vp: { width: 390,  height: 844 }, wait: 2000 },
  { name: 'auth-desktop',       url: '/auth',     vp: { width: 1440, height: 900 }, wait: 1600 },
  { name: 'scan-desktop',       url: '/scan',     vp: { width: 1440, height: 900 }, wait: 1600 },
  { name: 'technology-desktop', url: '/technology',vp:{ width: 1440, height: 900 }, wait: 1500 },
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
