# Real-integration checklist

Top-level guide for taking AuraLens from *"works in architecture and fallback mode"* to *"works against real Supabase, real RevenueCat sandbox, real LLM, on real hardware"*.

Work the four blocks below in order. Each links to a focused step-by-step doc.

## 0. Pre-flight (already done)

```bash
npm install
npm test                  # 65/65
npx tsc --noEmit          # clean
npx expo-doctor           # 17/17
npm run verify:release    # PASS 110 / 0
npm run verify:integrations   # PASS 53 / 0 (structural)
```

If any of those fail, do not start integration work. Fix them first.

## 1. Supabase live deployment → [`supabase-live-deployment.md`](./supabase-live-deployment.md)

What you get:
- Auth working (email/password + magic link)
- Reading sync working across devices
- Photo upload (opt-in only) writing to a private bucket
- Delete-data flow actually deleting cloud rows + storage objects
- AI Buddy reachable via edge function URL

Outcome marker: `npm run verify:integrations -- --live=production` passes for Supabase fields.

## 2. RevenueCat sandbox → [`revenuecat-sandbox-test.md`](./revenuecat-sandbox-test.md)

What you get:
- `auralens_instant_reading_099` produces 1 credit in sandbox
- `auralens_monthly_999` flips `hasMonthly` to true
- Restore Purchases returns a real subscription
- Server-side entitlement snapshot updated

Outcome marker: a sandbox purchase appears in RevenueCat → Customers panel.

## 3. AI Buddy live LLM → [`llm-live-test.md`](./llm-live-test.md)

What you get:
- Real Anthropic or OpenAI responses end-to-end
- Crisis guardrail proven on a live deployment
- Forbidden-key rejection proven against the deployed function
- Rate limit proven on a sandbox user

Outcome marker: `supabase functions invoke ai-buddy` returns a `reply` and writes two rows to `ai_buddy_messages`.

## 4. Device smoke test → [`device-smoke-test.md`](./device-smoke-test.md)

What you get:
- Development build installed on a real iOS device via TestFlight internal
- Development build installed on a real Android device via Play internal
- Full QA walkthrough passes on both

Outcome marker: every box in the device-smoke checklist is ticked.

---

## Hard rules

- **Never** put `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` into `.env` or `app.config.ts`. They are server-only. `npm run verify:integrations` will fail if you do.
- **Never** put Stripe checkout into the iOS/Android native app for digital aura readings. The verifier doesn't enforce this — Apple/Google will reject the binary.
- **Never** ship without `npm run verify:release` and `npm run verify:integrations` passing on the same machine that produced the EAS build.

## Operator dashboard map → [`manual-dashboard-steps.md`](./manual-dashboard-steps.md)

The single page that lists exactly what *you* have to do in which dashboard. Print it.
