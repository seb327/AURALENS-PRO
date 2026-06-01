# Railway deployment (AI Aura Buddy)

AuraLens supports two parallel deployment targets for the AI Aura Buddy:

1. **Supabase Edge Function** (default) — deploy via `supabase functions deploy ai-buddy`
2. **Railway / Node host** (this doc) — deploy via `railway up`

Both share the same code in `supabase/functions/_shared/` and behave identically. Pick one, or run both and flip via a single env var.

## Why Railway?

- You want a Node runtime instead of Deno
- You want longer execution timeouts, persistent connections, or specific Node libraries
- You're already on Railway for other services and want one dashboard
- You want simpler local dev (`npm run dev` with hot reload)

## Files involved

| Path | Purpose |
|---|---|
| [`server/`](../server/) | Self-contained Node 20 + Express app |
| [`server/src/index.ts`](../server/src/index.ts) | HTTP server with the same 10-step pipeline as the edge function |
| [`server/Dockerfile`](../server/Dockerfile) | Multi-stage build; bundles shared modules via esbuild |
| [`server/.env.example`](../server/.env.example) | Server-side env reference (Railway → Variables) |
| [`server/README.md`](../server/README.md) | Full server reference |
| [`railway.json`](../railway.json) | Railway project config — Dockerfile builder, `/health` check |

## One-time setup

```bash
npm install -g @railway/cli
railway login
```

## Deploy

```bash
cd C:\Users\Seb\Desktop\auralens
railway init                # creates a project, links this folder
```

Set the variables in the Railway dashboard (Project → Variables) **or** via CLI:

```bash
railway variables set \
  SUPABASE_URL=https://<ref>.supabase.co \
  SUPABASE_ANON_KEY=eyJ... \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  AI_PROVIDER=anthropic \
  AI_MODEL=claude-3-5-sonnet-latest \
  ANTHROPIC_API_KEY=sk-ant-...
```

Then:

```bash
railway up
```

Railway builds from `server/Dockerfile`, exposes port 3000, and hits `/health` to confirm the container is alive.

When the deploy finishes, Railway prints the assigned URL (e.g. `https://auralens-ai-buddy.up.railway.app`).

## Wire the mobile app to Railway

Add to your `.env`:

```
EXPO_PUBLIC_AI_BUDDY_URL=https://auralens-ai-buddy.up.railway.app
```

That's it. The client (`services/aiBuddyService.ts`) detects this variable and posts to the Railway URL instead of `sb.functions.invoke('ai-buddy')`. The Supabase JWT is forwarded as `Authorization: Bearer …`, so the server-side auth check still works.

Rebuild the dev client whenever you change this var:

```bash
eas build --profile development --platform ios
# or
npx expo start --clear
```

To revert to the Supabase Edge Function, unset the variable:

```
EXPO_PUBLIC_AI_BUDDY_URL=
```

## Verify it's working

### Health
```bash
curl https://auralens-ai-buddy.up.railway.app/health
# { "ok": true, "supabase": true, "provider": "anthropic" }
```

### Round-trip with a real Supabase user JWT
```bash
curl -X POST https://auralens-ai-buddy.up.railway.app/ai-buddy \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "message":"how is my aura today?",
    "context":{"reading":{"label":"Clear Aura","score":80,"dominantColour":"Gold"}}
  }'
```

Expected envelopes (same as the edge function):
- **200** with `{reply, suggestedPractices, reflectionQuestion, tone, crisisDetected, disclaimer}` → live LLM
- **402** with `{ok:false, requiresMonthly:true}` → user has no monthly entitlement snapshot yet
- **401** → wrong / expired JWT
- **400** with `Field "<key>" is not allowed…` → tried to send an image / base64 / landmark field
- **429** with `rateLimited:true` → over 40 messages in 24h

### Crisis test (must not call the LLM)
```bash
curl -X POST https://auralens-ai-buddy.up.railway.app/ai-buddy \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message":"i want to die"}'
```
Expected: **200** with `crisisDetected: true` and regional crisis resources in `reply`. A `[crisis_guardrail_triggered]` row appears in `ai_buddy_messages`.

## Local dev against the server

```bash
cd server
cp .env.example .env       # fill values
npm install
npm run dev                # tsx watch mode
```

Hit `http://localhost:3000/health` from a second terminal.

## Production build locally (sanity check before deploy)

```bash
cd server
npm run build              # esbuild → dist/index.js
npm start                  # node dist/index.js
```

If `npm run build` fails, check the import paths to `../supabase/functions/_shared/`. The Dockerfile copies that directory into the build context, so production builds always have it.

## Variables — exact same set as Supabase function secrets

| Variable | Where to get it | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase → *Project Settings → API* | **Yes** |
| `SUPABASE_ANON_KEY` | Same place (anon public) | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Same place (service_role) | Recommended |
| `AI_PROVIDER` | `anthropic` or `openai` | **Yes** |
| `AI_MODEL` | optional override | No |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com | If provider=anthropic |
| `OPENAI_API_KEY` | https://platform.openai.com | If provider=openai |
| `PORT` | Railway injects this automatically | Auto |

All of these are **server-side only**. They never appear in the mobile binary. The verifier (`npm run verify:integrations`) blocks any of `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` from leaking into client code.

## When to use Railway vs Supabase Edge Functions

| Scenario | Recommended |
|---|---|
| Single LLM provider, low to moderate volume | Supabase Edge Function |
| You want Node runtime / native modules | Railway |
| You want longer timeouts than Edge Functions allow | Railway |
| You already have a Railway billing setup | Railway |
| You want zero infrastructure to think about | Supabase Edge Function |

Both are deployed independently; you can have one off and one on. The mobile app picks by a single env var.

## Compliance notes

- The Railway server has the **same** forbidden-key guard as the edge function (`rejectIfForbiddenKeys`) — checked at root and inside `context`
- The Railway server has the **same** crisis guardrail — pre + post check, never sends crisis phrases to the LLM
- The Railway server has the **same** monthly entitlement check via `entitlement_snapshots`
- The Railway server has the **same** 40-messages-per-24h rate limit
- Body size is capped at 64KB (`express.json({ limit: '64kb' })`) so no one can sneak a base64 image past the key check

There is **no functional difference** between Railway and Supabase Edge Function from the user's perspective. The pipeline is intentionally identical.
