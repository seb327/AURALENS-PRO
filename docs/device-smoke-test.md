# Device smoke test

Print this. Walk it on a real device. Tick every box.

Run this **after** Supabase live deployment, RevenueCat sandbox setup, and LLM live test have all passed in isolation. This is the integration walkthrough that proves the whole product works on hardware.

## Prerequisites
- iOS device + an Apple ID with a sandbox tester signed into App Store
- Android device + a Google account in the License Testers list + on the Play internal track opt-in URL
- `.env` (or `.env.preview`) filled with real Supabase + RevenueCat keys
- A dev or preview EAS build available (`eas build --profile development --platform ios`/`android`)

## Pre-launch

- [ ] `npm install`
- [ ] `npm test` — 65/65
- [ ] `npx tsc --noEmit` — clean
- [ ] `npx expo-doctor` — 17/17
- [ ] `npm run verify:release` — PASS
- [ ] `npm run verify:integrations -- --live=development` — PASS
- [ ] `npm run smoke:config` — every subsystem shows the expected mode

---

## iOS — development build

### Install
- [ ] `eas build --profile development --platform ios` succeeded
- [ ] Build installs on device via TestFlight / link
- [ ] App icon appears on home screen (gold/violet orb, not a default icon)
- [ ] Splash screen shows the obsidian + orb art (not a blank white screen)

### Cold launch
- [ ] Hero loads in <3s
- [ ] Particles drift; orb pulses; no jank
- [ ] *Try Now* navigates

### Permissions
- [ ] Camera permission prompt shows the AuraLens-branded copy
- [ ] Photo library permission prompt shows the AuraLens-branded copy
- [ ] Both can be denied and re-granted via Settings.app

### Scan
- [ ] Front camera renders inside the framing guides
- [ ] *Begin Scan* captures + advances to /processing
- [ ] Successful capture produces a result
- [ ] A blurry capture bounces back with a rescan message; **credit not consumed**

### Upload
- [ ] All three photo slots required
- [ ] Each slot opens the photo picker
- [ ] *Generate Reading* navigates to /processing
- [ ] On success a reading is saved

### Result + history
- [ ] Result page shows orb, label, score, zones, guidance
- [ ] *Save reading* persists to Timeline
- [ ] Tapping a Timeline row opens `/reading/[id]` correctly
- [ ] *Compare with another reading* (with 2+ saved) shows Then vs Now

### Sandbox IAP (RevenueCat)
- [ ] Pricing screen no longer shows the "RevenueCat is not configured" dev banner
- [ ] *Unlock One Reading* prompts the sandbox Apple ID
- [ ] After confirmation Settings shows Reading credits: 1
- [ ] *Start Monthly* prompts and unlocks `hasMonthly = true`
- [ ] Timeline + Aura Buddy now accessible
- [ ] Customer appears in RevenueCat dashboard

### Supabase sync
- [ ] Sign up in-app with a real email; magic link received
- [ ] Settings → toggle Cloud sync on
- [ ] Take a reading → *Sync Now* reports pushed ≥1
- [ ] `select * from public.readings` shows the row
- [ ] Settings → toggle Upload photos on → next reading uploads to the private bucket
- [ ] `select * from public.reading_images` shows a row with `consent_given = true`

### Aura Buddy (live LLM)
- [ ] Open Buddy from the result page
- [ ] Send "how is my aura today?" — reply lands within 5s
- [ ] Reply does **not** carry the "Local guidance (offline)" tag
- [ ] Suggested practice chips render
- [ ] Reflection card renders
- [ ] Send a crisis phrase — calm crisis response returned, no LLM hit, `[crisis_guardrail_triggered]` row added

### Delete data
- [ ] Settings → Delete My Data → Delete local readings — clears timeline immediately
- [ ] Delete cloud readings — `select count(*) from readings where deleted_at is null` returns 0
- [ ] Delete uploaded photos — bucket listing empty for the user prefix
- [ ] Delete Everything — local + cloud zeroed; app bounces home

### Restore purchases
- [ ] Sign out then back in
- [ ] Restore Purchases — monthly entitlement recovered
- [ ] Consumable explanation alert shown if no subscription found

### Error boundary
- [ ] In development, simulate a render crash (temporarily throw inside a screen) — calm fallback shown with retry button
- [ ] Tapping retry recovers without restarting the app

---

## Android — development build

Same checklist, with these differences:
- [ ] `eas build --profile development --platform android` succeeded
- [ ] APK installs via Play internal opt-in URL or sideload
- [ ] Play Billing sandbox dialog shows "This is a test purchase"
- [ ] Adaptive icon renders correctly (foreground orb on the device's chosen background shape)
- [ ] Back gesture exits screens cleanly

---

## Post-walk

- [ ] Capture **real** on-device screenshots from this build — 5 frames for App Store + 5 for Play
- [ ] Drop those into `assets/store/screenshots/` (preserve filenames)
- [ ] Re-run `npm run verify:release` to confirm dimensions still match
- [ ] File any deviations from this list as issues in the project tracker

---

## What this proves

When every box above is ticked you have:
- A real binary signed by Apple and Google
- Real money pathways (sandboxed but identical to production)
- Real Supabase database receiving and serving data
- Real LLM responding to real user messages with crisis + forbidden-key guardrails on
- Real RLS preventing cross-user reads
- Real refund safety on failed readings
- Real account / data deletion working end-to-end

That's the bar for *"ready to submit"*. Anything less is still pre-integration.
