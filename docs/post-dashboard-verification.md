# Post-dashboard verification

After you finish the dashboard work in [`START-HERE-LIVE-SETUP.md`](./START-HERE-LIVE-SETUP.md) and your `.env` is filled with real keys, run the commands below in order. Each one tells you what to expect and what to do if it fails.

## 1. Sanity check the env

```bash
npm run smoke:config
```

Expected output:
```
AuraLens config smoke test — .env (loaded)
────────────────────────────────────────────
  App identity          AuraLens                bundle=com.vybstak.auralens pkg=com.vybstak.auralens
  Supabase              LIVE                    url + anon key present
  RevenueCat (iOS)      LIVE SDK                key present, dev-build will use react-native-purchases
  RevenueCat (Android)  LIVE SDK                key present
  AI Aura Buddy         EDGE FUNCTION           LLM keys live on the edge function, never the device
  EAS project           CONFIGURED              aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
────────────────────────────────────────────
Live subsystems: 6 / 6
```

If anything says `MOCK` or `UNCONFIGURED` you missed a step in the START-HERE doc. Go back to it.

## 2. Live structural verification

```bash
npm run verify:integrations -- --live=development
```

Expected:
```
PASS 57
WARN 0
FAIL 0

Integration verification passed (live mode: development).
```

(The number jumps from 53 to ~57 because live mode adds checks that the actual env file values are non-placeholder.)

Common failures:
- `EXPO_PUBLIC_SUPABASE_URL looks unset / placeholder` → you have `https://your-prod-project.supabase.co` or similar — replace with the real URL
- `REVENUECAT_IOS_KEY looks unset / placeholder` → starts with `xxx` — paste the real key
- Server-only key leak in client code → you accidentally pasted `ANTHROPIC_API_KEY` into `.env`. Delete it. LLM keys go on the edge function via `supabase secrets set`.

## 3. The full release gate

Run the same five commands you've been running through every phase:

```bash
npm install
npm test
npx tsc --noEmit
npx expo-doctor
npm run verify:release
```

Expected:
- `npm test` → **65/65 tests passing across 6 suites**
- `tsc` → clean (no output is good)
- `expo-doctor` → **17/17 checks passed**
- `verify:release` → **PASS 110 / WARN 0 / FAIL 0**

If any of these regress, you've changed something local. Roll back the change and re-run.

## 4. Live edge function smoke test (curl)

You need a JWT for one of your Supabase users. Easy way:
1. Supabase dashboard → *Authentication → Users* → pick your test user → *…* → *Send magic link*
2. Open the email link in any browser; the URL contains `access_token=…`. Copy it.

Then:
```bash
curl -X POST "https://<your-ref>.functions.supabase.co/ai-buddy" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"how is my aura today?","context":{"reading":{"label":"Clear Aura","score":80,"dominantColour":"Gold"}}}'
```

Three valid outcomes:
- **200** with `{"reply":"...","crisisDetected":false,"disclaimer":"..."}` → live LLM working
- **402** with `{"requiresMonthly":true}` → user has no monthly entitlement snapshot yet (expected before sandbox purchase)
- **401** → wrong / expired JWT, regenerate

Crisis guardrail check:
```bash
curl -X POST "https://<ref>.functions.supabase.co/ai-buddy" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"i want to die"}'
```
Must return `crisisDetected: true` with regional resources. If it ever calls the LLM with a crisis phrase, that's a critical bug — file it immediately.

Forbidden-key check:
```bash
curl -X POST "https://<ref>.functions.supabase.co/ai-buddy" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"hi","photoBase64":"AAAA"}'
```
Must return **400** with `Field "photoBase64" is not allowed…`. Same for `faceLandmarks`, `pixels`, etc.

## 5. iOS development build

```bash
npx expo install react-native-purchases
npx expo install @react-native-ml-kit/face-detection   # optional, for real landmarks
eas build --profile development --platform ios
```

Expected: EAS prints a build link after ~10 minutes. Open the link on your iOS device; install; open the app.

Signs it worked:
- App icon shows the AuraLens orb (not the default Expo icon)
- Splash shows the obsidian + orb art (not white)
- Pricing screen does **not** show the "RevenueCat is not configured" dev banner
- Settings → Integrations panel shows everything as **Configured / Live**

Common failures:
- `Missing usage description` — already wired in `app.config.ts`; if you see this, you likely ran `expo prebuild` with a stale config. Delete `ios/` and re-run.
- `Apple ID couldn't be created` — your Apple Developer account isn't fully activated yet. Wait 24h.
- `Build failed: react-native-purchases` — you skipped `npx expo install react-native-purchases`.

## 6. Android development build

```bash
eas build --profile development --platform android
```

Expected: build link or APK after ~10 minutes. Install via Play internal opt-in URL or sideload.

Signs it worked:
- App icon shows the adaptive icon (orb on obsidian background)
- Same in-app integration panel status as iOS

## 7. Connect the dev client to the bundler

```bash
npx expo start --dev-client
```

Scan the QR with the dev-client app (not Expo Go) on the device. The app boots into the bundled JS, hot reloads as you edit files.

## 8. Walk the device smoke test

[`device-smoke-test.md`](./device-smoke-test.md) — open it on a second screen and tick every box.

The most critical boxes:
- [ ] Sandbox £0.99 purchase succeeds and grants 1 credit
- [ ] Successful reading consumes that credit
- [ ] **A failed-quality scan does NOT consume the credit** — this is the refund-safety invariant
- [ ] Sandbox £9.99 purchase unlocks Timeline + Aura Buddy
- [ ] Aura Buddy reply does **not** carry the "Local guidance (offline)" tag
- [ ] Crisis phrase returns calm resources without an LLM call (verify by checking `[crisis_guardrail_triggered]` row in `ai_buddy_messages`)
- [ ] Delete cloud account data → `select count(*) from readings where deleted_at is null` returns 0

## 9. Capture real screenshots

Once the dev build is on a real device with real data:

1. Open Hero → take a screenshot
2. Open Pricing → screenshot
3. Run a reading to /result → screenshot
4. Open Aura Buddy after a chat → screenshot
5. Open Timeline with 3+ readings → screenshot

For iOS: Cmd+Shift+4 on simulator, or hardware buttons on device.
For Android: Volume Down + Power.

Drop the PNGs into `assets/store/screenshots/` replacing the mock frames (same filenames). Then:
```bash
npm run verify:release
```
The verifier will confirm the dimensions still match.

## 10. Submission readiness

When sections 1–9 are all green you have a real, testable, integration-complete build. At this point you can:
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

Production builds are what go to TestFlight / Play internal track. Submission via:
```bash
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

(Both require the Apple ASC API key + Play service-account JSON configured per [`manual-dashboard-steps.md`](./manual-dashboard-steps.md).)

## Quick decision tree

```
verify:integrations --live FAILS  → fix the failing env value
                          PASSES  → next
edge function curl FAILS          → check supabase functions deploy + secrets set
                   PASSES         → next
eas build FAILS                    → read the EAS log; usually env or signing
          SUCCEEDS                 → install on device → walk device-smoke-test.md
device-smoke-test.md ALL TICKED    → capture real screenshots
                     ANY FAIL      → log the issue; do not submit
all green                          → eas build --profile production
                                   → eas submit
```

## If you get stuck

Re-open [`START-HERE-LIVE-SETUP.md`](./START-HERE-LIVE-SETUP.md) — the gotcha tables at the bottom of every step cover 95% of issues.
