# AI Aura Buddy — live LLM test

Goal: prove that the real LLM path works end-to-end. The crisis guardrail and forbidden-key rejection must still hold in production.

## Prerequisites
- Supabase project deployed (see `supabase-live-deployment.md`)
- `ai-buddy` edge function deployed
- A signed-in test user with `has_monthly = true` in their latest `entitlement_snapshots` row

## 1. Pick a provider

The function supports two providers and a deterministic local fallback. Pick one:

| Provider  | Env var(s)                     | Suggested model              |
|-----------|--------------------------------|------------------------------|
| Anthropic | `ANTHROPIC_API_KEY`            | `claude-3-5-sonnet-latest`   |
| OpenAI    | `OPENAI_API_KEY`               | `gpt-4o-mini`                |
| Fallback  | none                           | n/a — returns canned reply   |

## 2. Set secrets on the edge function

```bash
# Anthropic
supabase secrets set \
  AI_PROVIDER=anthropic \
  ANTHROPIC_API_KEY=sk-ant-... \
  AI_MODEL=claude-3-5-sonnet-latest

# OR OpenAI
supabase secrets set \
  AI_PROVIDER=openai \
  OPENAI_API_KEY=sk-... \
  AI_MODEL=gpt-4o-mini
```

Confirm:
```bash
supabase secrets list
```

## 3. Re-deploy the function if needed
Secrets propagate without a redeploy, but if you changed code:
```bash
supabase functions deploy ai-buddy
```

## 4. Smoke test 1 — fallback mode
Temporarily unset provider:
```bash
supabase secrets unset AI_PROVIDER ANTHROPIC_API_KEY OPENAI_API_KEY
```

Send a request:
```bash
curl -X POST "https://<ref>.functions.supabase.co/ai-buddy" \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message":"how is my aura today?"}'
```

Expected: `{"reply":"Aura Buddy is being upgraded..."}`-style fallback string with `crisisDetected: false`. **Re-set the provider before continuing.**

## 5. Smoke test 2 — Anthropic mode
```bash
supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... AI_MODEL=claude-3-5-sonnet-latest
```

```bash
curl -X POST "https://<ref>.functions.supabase.co/ai-buddy" \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "message":"I have felt scattered all week, what does my reading suggest?",
    "context":{"reading":{"label":"Rising Aura","score":74,"dominantColour":"Gold","element":"Fire","confidence":80,"zoneScores":{"forehead":78,"brows":68,"eyes":71,"nose":70,"cheeks":62,"mouth":60,"chinJaw":58},"guidanceSummary":"Strong forward movement."}}
  }'
```

Expected:
- `200 OK`
- JSON with `reply`, `suggestedPractices` (array), `reflectionQuestion`, `tone`, `crisisDetected: false`, `disclaimer`
- Two new rows in `ai_buddy_messages` (user + buddy) for that user

## 6. Smoke test 3 — OpenAI mode
```bash
supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=sk-... AI_MODEL=gpt-4o-mini
```

Re-run the same curl. Reply should be a different style; envelope shape must be identical.

## 7. Smoke test 4 — crisis guardrail (server-side)

```bash
curl -X POST "https://<ref>.functions.supabase.co/ai-buddy" \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message":"I want to die"}'
```

Expected:
- `200 OK`
- `crisisDetected: true`
- `reply` contains regional crisis resources (UK 116 123, US 988, etc.)
- **No** charge to the LLM provider — the function short-circuits before calling
- A `system` row `[crisis_guardrail_triggered]` added to `ai_buddy_messages`

## 8. Smoke test 5 — forbidden-key rejection

```bash
curl -X POST "https://<ref>.functions.supabase.co/ai-buddy" \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","photoBase64":"AAAA"}'
```

Expected:
- `400 Bad Request`
- `{"ok":false,"error":"Field \"photoBase64\" is not allowed..."}`

Also try nesting it inside `context`:
```bash
-d '{"message":"hi","context":{"faceLandmarks":[{"x":1}]}}'
```

Expected: `400` with `Field "context.faceLandmarks" is not allowed...`.

## 9. Smoke test 6 — rate limiting

Send 41 messages within 24 hours from the same user. The 41st should return:
- `429 Too Many Requests`
- `{"ok":false,"error":"You've reached today's Aura Buddy limit...","rateLimited":true}`

(Quick script: loop a `curl` 41 times.)

## 10. From the app

1. Sign in with a monthly-subscribed test user
2. Take a reading
3. Tap *Ask Aura Buddy about this reading*
4. Send a question
5. Confirm:
   - The reply lands within a few seconds
   - Suggested-practice chips render
   - The reflection card renders
   - The message does **not** carry the *Local guidance (offline)* tag — that tag only appears when `source === 'fallback'`

## 11. What the LLM is allowed to see
- `auraResult` (label, score, confidence, colours, element)
- `mienShiangZones` zone scores
- `guidance.summary`
- The user's typed message
- The last 6 conversation turns

## 12. What the LLM is **never** allowed to see
- Photos, base64, thumbnails (rejected at client + server)
- Face landmarks, pose data, pixel arrays
- Health, location, device identifiers

Final check:
```bash
npm run verify:integrations -- --live=development
```
