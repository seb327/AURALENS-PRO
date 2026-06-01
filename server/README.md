# AuraLens AI Aura Buddy server (Railway)

Self-contained Node 20 / Express HTTP server that mirrors the Supabase Edge Function pipeline. Deploy this as a parallel target when you'd rather host the LLM proxy on Railway than on Supabase Functions.

The shared pipeline modules (`crisisGuardrail`, `rateLimit`, `aiProvider`, `buddyTypes`) are imported directly from `../supabase/functions/_shared/` and bundled by esbuild — **no duplicated logic** between the two deployments.

## Pipeline (identical to the edge function)

1. CORS preflight
2. Reject forbidden image/biometric keys at the root or inside `context`
3. Authenticate via Supabase JWT (`Authorization: Bearer <user-jwt>`)
4. Verify monthly entitlement from latest `entitlement_snapshots` row
5. Rate limit per user (40 messages / 24h, configurable in `rateLimit.ts`)
6. Pre-call crisis guardrail — short-circuits before the LLM is touched
7. Call Anthropic / OpenAI / safe local fallback
8. Post-call crisis guardrail
9. Persist user + assistant messages into `ai_buddy_messages`
10. Return structured `AiBuddyResponse` JSON

## Deploy to Railway

```bash
# 1. From the project root (where railway.json lives), link the project
npm install -g @railway/cli   # one-time
railway login
railway init                   # creates a project, links this folder

# 2. Set variables (see server/.env.example for the full list)
railway variables set \
  SUPABASE_URL=https://<ref>.supabase.co \
  SUPABASE_ANON_KEY=eyJ... \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  AI_PROVIDER=anthropic \
  AI_MODEL=claude-3-5-sonnet-latest \
  ANTHROPIC_API_KEY=sk-ant-...

# 3. Deploy
railway up
```

Railway uses [`railway.json`](../railway.json) at the project root:
- Builder: `DOCKERFILE`
- Dockerfile: `server/Dockerfile`
- Healthcheck: `GET /health`

After `railway up`, copy the assigned URL (e.g. `https://auralens-ai-buddy.up.railway.app`).

## Point the mobile app at Railway

Add to your `.env` (any profile):

```
EXPO_PUBLIC_AI_BUDDY_URL=https://auralens-ai-buddy.up.railway.app
```

The mobile client (`services/aiBuddyService.ts`) prefers this URL when set. If unset, it falls back to the Supabase Edge Function URL via `sb.functions.invoke('ai-buddy')`. You can run both deployments at once — flip between them by toggling this single env var.

## Endpoints

| Method | Path        | Purpose                                                              |
|-------:|-------------|----------------------------------------------------------------------|
| GET    | `/`         | Service identifier + status                                          |
| GET    | `/health`   | Healthcheck — returns `{ ok, supabase, provider }`                  |
| POST   | `/`         | Aura Buddy request (Authorization bearer required)                   |
| POST   | `/ai-buddy` | Same as `POST /` — mounted twice so paths match both Railway and the Supabase functions URL convention |

## Local development

```bash
cd server
cp .env.example .env       # fill values
npm install
npm run dev                # tsx watch — hot reloads on save
```

Then from another terminal:

```bash
# health
curl http://localhost:3000/health

# round-trip (needs a real Supabase user JWT — see docs/llm-live-test.md)
curl -X POST http://localhost:3000/ai-buddy \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message":"how is my aura today?","context":{"reading":{"label":"Clear Aura","score":80,"dominantColour":"Gold"}}}'
```

## Production build

```bash
npm run build       # esbuild bundles src/index.ts + shared modules into dist/index.js
npm start           # node dist/index.js
```

## Required variables on Railway

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key — used to verify the caller's JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — used for trusted reads of `entitlement_snapshots` and trusted writes to `ai_buddy_messages` |
| `AI_PROVIDER` | `anthropic` or `openai` |
| `AI_MODEL` | Override (defaults: `claude-3-5-sonnet-latest` / `gpt-4o-mini`) |
| `ANTHROPIC_API_KEY` | If provider=anthropic |
| `OPENAI_API_KEY` | If provider=openai |
| `PORT` | Railway injects this automatically |

`PORT` and `HOST` are read at boot. The Dockerfile exposes 3000; Railway routes its assigned port to this.

## What this **never** receives

The same forbidden-key list as the edge function — images, base64, raw landmarks, pixels. Verified by [`rejectIfForbiddenKeys`](../supabase/functions/_shared/buddyTypes.ts) at both root and nested `context` level. Tested in [`services/__tests__/aiBuddy.test.ts`](../services/__tests__/aiBuddy.test.ts).
