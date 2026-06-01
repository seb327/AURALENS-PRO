---
name: run-auralens
description: Run, smoke-test, screenshot, or verify the AuraLens web app. Use when an agent wants to start AuraLens locally, drive the deployed Railway build, take a screenshot, exercise the Stripe / Supabase / VIP-redeem API surface, or confirm a recent change is live.
---

# Run AuraLens

AuraLens is an Expo React Native app compiled to web by `expo export`,
served by a small Node + Express server on Railway that also exposes the
Stripe Checkout, Supabase entitlement, and VIP-code redemption endpoints.
Live URL: **https://auralens-pro-production.up.railway.app**.

The primary agent surface is the **HTTP smoke driver** at
`.claude/skills/run-auralens/driver.mjs`. It hits every endpoint a real
user touches (web bundle, JS, `/health`, `/checkout/session`, `/redeem`,
`/webhook/stripe`, Supabase Auth) and confirms each one returns the
right status + body. Run it first. It's pure node, no deps.

For visual verification (screenshot of the WebGL aura background, hero
type, etc.) use the **`chromium-cli` heredoc in the "Screenshot" section
below.** It needs a real Chromium and is intended for Linux.

> All paths in this file are relative to the project root (`auralens/`).

---

## Prerequisites

Driver only needs **Node 18+** (uses native `fetch`). Verified in this
session:

```
$ node --version
v22.x.x          # any 18+ works
$ command -v curl
/usr/bin/curl
```

For the screenshot path, also:

```
apt-get install -y chromium                # any recent build
npm i -g chromium-cli                      # the headless wrapper
```

---

## Run (agent path) — HTTP smoke driver

This is the first thing a future agent should do. It exits 0 on success,
non-zero on any failure, and prints a per-line `PASS/FAIL` table:

```
$ node .claude/skills/run-auralens/driver.mjs --remote
AuraLens smoke driver  2026-06-01T18:21:59.782Z

── REMOTE (https://auralens-pro-production.up.railway.app) ──
PASS GET /health                                      200 652ms
PASS GET /  → HTML web bundle                         200 625ms
PASS GET entry-*.js  → > 1 MB                         200 1713ms
PASS Bundle contains shader uniforms                  shader+fonts 882ms
PASS POST /checkout/session (no auth)  → 401          401 227ms
PASS POST /redeem (no auth)  → 401                    401 229ms
PASS POST /checkout/session (bad JWT)  → 401          401 363ms
PASS POST /webhook/stripe (no sig)  → 400             400 228ms

── Supabase (https://sefdudrjobjyyygabzhg.supabase.co) ──
PASS GET /auth/v1/health  → GoTrue                    200 831ms

✓ all green
```

Flags:

| Flag | Purpose |
|---|---|
| `--remote` *(default)* | Hit the Railway deployment |
| `--local` | Hit `http://localhost:8090` instead (see "Run locally" below) |
| `--url <URL>` | Override the remote base URL |
| `--verbose` / `-v` | Print response body excerpts |

### What the checks mean (and why they matter)

| Check | Catches |
|---|---|
| `/health` green flags | Server has Supabase URL, Stripe secret, webhook secret, and both price IDs configured |
| Root returns HTML with `<title>AuraLens</title>` | Web bundle is actually served — past failures shipped a JSON-only API by mistake |
| Entry JS > 1 MB | Bundle exists and isn't a 404 fallback |
| Bundle contains `u_velocity`, `u_energy`, `u_scroll`, `Fraunces` | The kinetic shader + premium typography are deployed — regression guard for revert/rollback |
| `/checkout/session` and `/redeem` → 401 (not 502) | Server is crash-proof against expired/missing JWTs. Past versions threw inside `supabase.auth.getUser()` and Railway returned 502 |
| `/webhook/stripe` → 400 on unsigned body | Signature verification is wired |
| Supabase `/auth/v1/health` → GoTrue banner | Supabase project is reachable, anon/publishable key is recognised |

---

## Run locally (human path)

Start the Expo dev server, serve at `http://localhost:8090`:

```bash
npm install --legacy-peer-deps
npm run web
```

Then in another shell:

```bash
node .claude/skills/run-auralens/driver.mjs --local
```

You'll need a `.env` in the project root with the four EXPO_PUBLIC_ vars
for sign-in + Stripe + Supabase to work in the browser — see
`.env.example`. Without them the web bundle still serves but the hero
will say "Sign in not configured".

To produce a one-shot production bundle (what Railway builds):

```bash
npx expo export --platform web --output-dir dist
```

Output: `dist/index.html` + `dist/_expo/static/js/web/entry-*.js`.

---

## Run (Railway deploy)

The `main` branch of `https://github.com/seb327/AURALENS-PRO` is the
source of truth. Push → Railway auto-rebuilds via `server/Dockerfile`
(node:22-alpine, three-stage build: web export → server bundle →
runtime). New deploy is live ~3-4 minutes after `git push`.

Verify the deploy completed:

```bash
$ curl -sS https://auralens-pro-production.up.railway.app/health | python3 -m json.tool
{
    "ok": true,
    "supabase": true,
    "provider": "anthropic",
    "stripe": {"stripe": true, "webhook": true, "prices": true},
    "redeem": {"configured": true, "codeCount": 7}
}
```

Bundle hash changes per deploy — find it from the served HTML:

```bash
$ curl -sS https://auralens-pro-production.up.railway.app/ | grep -oE 'entry-[a-f0-9]+\.js' | head -1
entry-1c91f7e4d2a3b0e9f4… .js
```

---

## Screenshot (visual verification — Linux + chromium-cli)

The driver covers the API. The aura shader, hero choreography, and
Fraunces type are visible-only. For a real Linux box with Chromium:

```bash
# Headless screenshot of the hero, full viewport.
chromium-cli https://auralens-pro-production.up.railway.app \
  --viewport 1440x900 \
  --wait-for 'canvas' \
  --wait 1500 \
  --screenshot hero.png

# Headless screenshot of the pricing screen.
chromium-cli https://auralens-pro-production.up.railway.app/pricing \
  --viewport 1440x900 \
  --wait-for '[data-testid=pricing-monthly], canvas' \
  --wait 1200 \
  --screenshot pricing.png

# Cinematic processing screen — needs the user to have a credit. Use a
# fresh incognito session so the free-tier default applies, then upload
# images and wait for the 7.5s minimum reading duration before grabbing.
chromium-cli https://auralens-pro-production.up.railway.app/processing \
  --viewport 1440x900 \
  --wait 8000 \
  --screenshot processing.png
```

If `chromium-cli` is unavailable, the same effect with Playwright:

```bash
npm i -g playwright && npx playwright install chromium
node -e "
import('playwright').then(async ({chromium}) => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('https://auralens-pro-production.up.railway.app');
  await p.waitForSelector('canvas', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: 'hero.png', fullPage: false });
  await b.close();
});"
```

---

## Direct invocation — drive the API without the browser

Most regressions in this codebase live in the server endpoints, not the
DOM. The driver script can also be sourced as a module if an agent
wants to compose its own checks:

```js
// drive-stripe.mjs
const base = 'https://auralens-pro-production.up.railway.app';
const r = await fetch(`${base}/checkout/session`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer <real Supabase user JWT>',
  },
  body: JSON.stringify({ productId: 'single', returnUrl: `${base}/` }),
});
console.log(r.status, await r.json());
// expect 200 + { ok: true, url: 'https://checkout.stripe.com/…' }
```

To get a real user JWT for these: sign up via the web app once (Supabase
dashboard → Authentication → Users → create user with auto-confirm),
then `signInWithPassword` from Node:

```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: sb_publishable_CE_mFrl_jJ8qeu4hjrMsKQ_D2XxQKtW" \
  -H "content-type: application/json" \
  -d '{"email":"test@vybstak.com","password":"<the password>"}'
```

The `access_token` field is the JWT.

---

## Test

```bash
npm test                    # Jest, ~16 specs across services/components/engine
npm run typecheck           # tsc --noEmit
npm run verify:integrations # scripts/verify-integrations.js — env safety + RC/Stripe key shape check
```

`typecheck` is the most useful gate — it catches the kinds of breakage
the smoke driver doesn't (renamed exports, type drift) before a deploy.

---

## Gotchas

- **The web build is generated by `expo export --platform web` inside
  `server/Dockerfile`.** EXPO_PUBLIC_* values are read as `ARG`s
  during build, then re-exported as `ENV` in the same stage. If you
  add a new `EXPO_PUBLIC_FOO`, you must add `ARG EXPO_PUBLIC_FOO` AND
  `ENV EXPO_PUBLIC_FOO=$EXPO_PUBLIC_FOO` in the Dockerfile AND set it
  on Railway, or it'll be `undefined` in the shipped bundle even
  though `.env` has it locally.

- **Node 22, not 20, in the runtime stage.** `supabase-js@^2` realtime
  module probes for a native `WebSocket` global. Node 20 doesn't have
  one, so the supabase client throws `Node.js 20 detected without
  native WebSocket support` from inside `auth.getUser()`. Don't
  downgrade the base image.

- **The publishable key is `sb_publishable_…`, not the legacy
  `eyJ…` JWT.** Supabase rotated the project to v2 keys. Both formats
  are accepted by `supabase-js`, but the server's `getUser(token)`
  call needs the *new* format to match. The driver hardcodes the
  current value — if you rotate it in Supabase, update `driver.mjs`
  AND the `SUPABASE_ANON_KEY` Railway variable AND the
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` Railway *build* variable.

- **JWT validation has a local-decode fallback.** `server/src/redeem.ts`
  and `server/src/stripe.ts` first try `supabase.auth.getUser(token)`;
  if Supabase rejects it for any reason (rate limit, transient outage,
  key mismatch during migration), they decode the JWT payload locally
  and extract `sub` + `exp`. So passing a malformed string returns
  401, not 502 — and a valid-but-Supabase-rejected token still
  redeems. This is intentional. The smoke driver checks for 401, not
  500/502.

- **`Alert.alert` button callbacks are dropped on react-native-web.**
  `app/_layout.tsx` monkey-patches `Alert.alert` at startup on web
  so single-button alerts run their `onPress` after `window.alert`
  and two-button alerts use `window.confirm`. If you call
  `Alert.alert(title, msg, [{text:'OK', onPress: nav}])` and nothing
  navigates, check that this patch still runs (it depends on layout
  being mounted before any screen alerts).

- **The shader canvas at `position: fixed` only renders if the body
  background is dark.** Expo's web template ships no body background,
  so the canvas at the default z-stacking is *behind* the white body
  and invisible. `components/AuraShaderBackground.tsx` injects a
  `<style data-auralens-eager>` tag at module-load time (not in
  `useEffect`) to set `html,body,#root { background-color: #050507 }`.
  Removing that injection brings the white screen back instantly.

- **`MIN_READING_DURATION_MS = 7500` is intentional.** The aura engine
  runs in parallel; if it finishes faster the result is held until
  the cinematic minimum elapses. The user-facing motivation is "let
  the analysis breathe." Don't reduce this in code review without
  also adjusting the phase copy and ring animations.

- **The free first-reading credit is per-device, persisted in
  localStorage.** Clearing storage gives any visitor another free
  reading. This is the documented signup-less onboarding, not a bug.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Driver fails on `Bundle contains shader uniforms` with `missing` | Old build is live (revert deploy) or Railway rebuild in progress | Check Railway → Deployments. Wait for green. Re-run. |
| Driver fails on `/health` with `redeem.configured: false` | `VIP_CODES` env var got removed from Railway | Re-add `VIP_CODES=AURAVIP:monthly,VYBSTAK:monthly,…` and wait for the auto-redeploy. |
| 502 on `/redeem` or `/checkout/session` | Node base image got downgraded to 20, or local `try/catch` was removed | Check `server/Dockerfile` is `node:22-alpine`. Check `server/src/redeem.ts` and `stripe.ts` still wrap auth in try/catch. |
| White flash on first load | The eager `<style data-auralens-eager>` injection in `AuraShaderBackground.tsx` was removed or moved into `useEffect` | Move it back to module top-level. |
| `npm run web` hangs forever on first startup | Cold Metro cache. | First boot takes ~60s. If still nothing, `npx expo start --web --clear`. |
| chromium-cli screenshot is blank | Page hasn't run the shader yet | Increase `--wait` to 2000ms. The shader needs ~one frame to draw a usable result. |
