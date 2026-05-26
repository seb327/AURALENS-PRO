# Supabase setup

AuraLens is local-first. Supabase is only used when both:
1. You have set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. The user has explicitly toggled **Cloud sync** in Settings.

If those conditions aren't met, the app keeps working from device storage and every sync call returns a no-op.

## 1. Create the project

1. Go to https://app.supabase.com and create a new project.
2. Copy the **Project URL** and the **anon public key** from *Project Settings → API*.
3. Add them to your `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

## 2. Run migrations

The SQL lives under [`supabase/migrations`](../supabase/migrations).

### Easiest: SQL editor

Open Supabase → SQL editor → paste `001_initial_schema.sql`, run. Then `002_rls_policies.sql`, run.

### With Supabase CLI

```bash
npm i -g supabase
supabase link --project-ref <ref>
supabase db push
```

## 3. Create the private storage bucket

In the Supabase dashboard → **Storage** → New bucket:
- **Name:** `reading-images`
- **Public:** off
- Save

The bucket policies in `002_rls_policies.sql` then restrict every object to the owner's `auth.uid()` prefix.

> Object paths look like `<user-id>/<reading-id>/<timestamp>.jpg`. RLS only lets a user read or write objects under their own user-id folder.

## 4. (Optional) Deploy edge functions

```bash
supabase functions deploy reconcile-entitlements --no-verify-jwt
supabase functions deploy ai-buddy
```

### RevenueCat → reconcile-entitlements

1. In RevenueCat → *Project Settings → Integrations → Webhooks*, set:
   - **URL**: `https://<project>.functions.supabase.co/reconcile-entitlements`
   - **Authorization** header: `Bearer <YOUR_SHARED_SECRET>`
2. In Supabase → *Edge Functions → reconcile-entitlements → Secrets*, set `REVENUECAT_WEBHOOK_AUTH=<YOUR_SHARED_SECRET>`.
3. Uncomment the auth check in `supabase/functions/reconcile-entitlements/index.ts`.
4. Wire the event handler to write into `public.entitlement_snapshots` using the Service Role key. (Phase 2.x TODO — see the function source.)

### ai-buddy (Phase 2.4 — live)

The function in [`supabase/functions/ai-buddy`](../supabase/functions/ai-buddy/index.ts) is a full request handler. It:

1. Rejects any request body containing `image`, `images`, `photo`, `photos`, `imageBase64`, `photoBase64`, `base64`, `imageData`, `photoData`, `pixels`, `landmarks`, `faceLandmarks` (in the root or inside `context`). Aura Buddy never receives images or raw biometric data.
2. Authenticates the caller via the Supabase JWT (`auth.getUser()`).
3. Checks the latest row in `public.entitlement_snapshots` and rejects with `402` if `has_monthly` is not true. RevenueCat remains the source of truth — clients refresh the snapshot via `entitlementSyncService` (already wired into `purchase` / `restore` / `refresh`).
4. Rate limits each user to 40 user messages per 24 hours (configurable in `_shared/rateLimit.ts`).
5. Runs the crisis guardrail **before** calling the LLM. Self-harm, harm-others, abuse, and immediate-danger phrases short-circuit to a calm direct response with regional crisis lines (UK 116 123, US 988, AU 13 11 14) — no LLM is called.
6. Calls Anthropic or OpenAI based on `AI_PROVIDER` (see env table below). Returns a deterministic local-fallback response if neither key is present.
7. Runs the crisis guardrail **after** the LLM reply in case the model wandered.
8. Persists both the user and the assistant turn into `public.ai_buddy_messages`, plus a system row tagged `[crisis_guardrail_triggered]` when applicable.
9. Returns `{ reply, suggestedPractices, reflectionQuestion, tone, crisisDetected, disclaimer }`.

Deploy:

```bash
supabase functions deploy ai-buddy

# Set provider secrets (Anthropic shown, OpenAI is identical with OPENAI_API_KEY)
supabase secrets set \
  AI_PROVIDER=anthropic \
  ANTHROPIC_API_KEY=sk-ant-... \
  AI_MODEL=claude-3-5-sonnet-latest
```

What the LLM **receives**:
- Aura label, score, confidence (0–100)
- Dominant + secondary colour, element
- Mien Shiang zone scores (0–100 per zone)
- Engine-generated guidance summary
- Optional timeline summary
- Last six turns of conversation
- The user's current message

What the LLM **never receives**:
- Raw photos, base64 images, or thumbnails
- Raw face landmarks or pose data
- Health, location, or device identifiers beyond what the user typed
- Anything in the forbidden-keys list

| Env var              | Where to set                                  | Notes                                  |
|----------------------|-----------------------------------------------|----------------------------------------|
| `AI_PROVIDER`        | `supabase secrets set`                        | `anthropic` or `openai`                |
| `AI_MODEL`           | `supabase secrets set`                        | Optional; sensible defaults per provider |
| `ANTHROPIC_API_KEY`  | `supabase secrets set`                        | Required for Anthropic                 |
| `OPENAI_API_KEY`     | `supabase secrets set`                        | Required for OpenAI                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected on Supabase                | Used for entitlement + persistence reads |

Test locally:

```bash
supabase functions serve ai-buddy --env-file ./supabase/.env.local
# In another terminal:
curl -X POST http://localhost:54321/functions/v1/ai-buddy \
  -H "Authorization: Bearer <your-user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message":"how is my aura today?","context":{"reading":{"label":"Clear Aura","score":80,"dominantColour":"Gold"}}}'
```

## 5. Data model summary

| Table                    | Purpose                                              | RLS |
|--------------------------|------------------------------------------------------|-----|
| `profiles`               | Per-user metadata + RC customer id + consent flags   | own |
| `readings`               | Reading outputs (label, score, zones, guidance)      | own |
| `reading_images`         | Pointers to private storage objects (opt-in only)    | own |
| `entitlement_snapshots`  | Advisory mirror of RC entitlements (not source of truth) | own |
| `ai_buddy_messages`      | Buddy chat history (Phase 2.4)                       | own |

**RevenueCat remains the source of truth for billing.** Supabase only stores snapshots for account continuity and debugging.

## 6. Privacy notes

- We do not store raw face landmarks. Only symbolic outputs.
- Photos are only uploaded when the user enables both *Cloud sync* and *Upload photos*.
- The bucket is private; views happen via short-lived signed URLs (default 10 min).
- Delete My Data supports granular deletion — local only, cloud readings only, photos only, all cloud data, or everything.

## 7. Local dev without Supabase

Leave `EXPO_PUBLIC_SUPABASE_*` empty. The app boots without a Supabase client, every sync function returns `skipped`, and Settings hides the cloud-sync controls. This is the recommended way to demo the app in Expo Go.
