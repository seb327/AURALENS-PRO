# Release Checklist

## Phase 2 prerequisites
- [x] Replace mock `purchaseService` with RevenueCat + StoreKit 2 + Google Play Billing (Phase 2.2)
- [ ] Create RevenueCat project, add API keys to `.env` (`REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY`)
- [ ] Configure products `auralens_instant_reading_199` and `auralens_monthly_799` in App Store Connect and Play Console
- [ ] Attach `auralens_monthly_799` to the `monthly` entitlement in RevenueCat
- [ ] Add `react-native-purchases` and build a dev client (`eas build --profile development`)
- [x] Add real face-landmark pipeline abstraction (Phase 2.1)
- [ ] Wire `@react-native-ml-kit/face-detection` in a dev build for production landmark accuracy
- [x] Supabase project + RLS migrations (Phase 2.3 — schema in `supabase/migrations`)
- [ ] Apply migrations to your Supabase project and create the private `reading-images` bucket
- [ ] Deploy `reconcile-entitlements` edge function and connect RevenueCat webhook
- [x] Move AI Buddy to a server-side LLM via Supabase edge function (Phase 2.4)
- [ ] `supabase functions deploy ai-buddy`
- [ ] `supabase secrets set AI_PROVIDER=… ANTHROPIC_API_KEY=… (or OPENAI_API_KEY=…)`
- [ ] Test crisis guardrail by sending a self-harm phrase from a sandbox account — verify no LLM call and crisis resources returned

## Phase 2.5 — EAS / TestFlight / Play readiness
- [x] `eas.json` with development / preview / production profiles
- [x] Env templates: `.env.development.example`, `.env.preview.example`, `.env.production.example`
- [x] Placeholder PNG assets (icon, adaptive icon, splash, favicon, store screenshots)
- [x] Docs: `eas-build.md`, `testflight.md`, `google-play-internal-testing.md`, `store-assets.md`, `privacy-declarations.md`, `qa-test-plan.md`
- [x] `npm run verify:release` script
- [ ] Run `eas init` to write a real `EAS_PROJECT_ID`
- [ ] Replace `REPLACE_WITH_*` placeholders in `eas.json` `submit.production`
- [ ] Drop final brand artwork over `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png` before public submission
- [ ] Run the full QA plan on a real iOS device and a real Android device
- [ ] `eas build --profile preview --platform ios` and install via TestFlight
- [ ] `eas build --profile preview --platform android` and install via Play internal opt-in URL

## Phase 2.6 — Branding & presentation polish
- [x] Brand guide in [`docs/brand-guide.md`](./brand-guide.md)
- [x] Six-tier aura label system (Clear / Rising / Mixed / Shielded / Clouded / Heavy)
- [x] Refined hero, technology, pricing, buddy copy
- [x] Branded asset generator with embedded 5×7 bitmap font
- [x] Real headlines + sublines + body cards on every store screenshot
- [x] Cinematic orb composition (3-layer gold/violet/blue + hairline rings + glint)
- [x] Verifier now checks asset dimensions, screenshot names, app.config asset paths, screenshot-copy compliance
- [ ] Drop final brand artwork (commissioned or Figma export) over the generated PNGs before public submission
- [ ] Confirm wordmark licence + legal sign-off on the public-facing name
- [ ] Capture real in-app screenshots from a production build to replace the mock frames (optional but recommended for App Store / Play polish)
- [ ] Add Supabase auth, RLS-enabled tables (`users`, `readings`, `uploaded_images`, `entitlements`, `ai_buddy_messages`), signed-URL storage
- [ ] Replace placeholder splash and icon assets

## Pre-submission
- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] Hero / pricing copy reviewed by legal
- [ ] Privacy policy + Terms URLs live and linked in app.config.ts
- [ ] Support email live
- [ ] Permission strings reviewed for App Store / Play
- [ ] App icon (1024×1024) and adaptive icon assets present
- [ ] Screenshots: 6.7", 6.1", 5.5" for iOS; phone + tablet for Android
- [ ] Age rating questionnaire completed
- [ ] App tracking transparency: no tracking declared

## iOS TestFlight
- [ ] EAS Build profile `preview` configured
- [ ] `eas build --platform ios --profile preview`
- [ ] Upload to TestFlight via `eas submit -p ios`
- [ ] Add internal testers

## Android internal testing
- [ ] EAS Build profile `preview` configured
- [ ] `eas build --platform android --profile preview`
- [ ] Upload to Play Console internal track via `eas submit -p android`
- [ ] Add internal testers via opt-in URL
