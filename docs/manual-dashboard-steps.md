# Manual dashboard steps

Everything below is **manual work in external dashboards** that I (Claude) cannot do for you. Each row tells you the dashboard, the action, and where the resulting value goes in code.

| # | Dashboard | Action | Goes into |
|---|-----------|--------|-----------|
| 1 | EAS | `eas login`, `eas init` — mints a project id | `EAS_PROJECT_ID` in `.env*` |
| 2 | Apple Developer | Register bundle ids: `com.vybstak.auralens`, `.preview`, `.dev` | Already in `app.config.ts` + `eas.json` (no edit needed) |
| 3 | App Store Connect | Create the app entry | Used by `eas submit` |
| 4 | App Store Connect | Create in-app product `auralens_instant_reading_099` (Consumable, £0.99) | Already in `constants/products.ts` |
| 5 | App Store Connect | Create subscription `auralens_monthly_999` (Auto-Renewable, £9.99/month, group `auralens_main`) | Already in `constants/products.ts` |
| 6 | App Store Connect | Create an API key (Issuer ID, Key ID, `.p8`) for RevenueCat | Pasted into RevenueCat dashboard (not the codebase) |
| 7 | App Store Connect | Add at least one Sandbox Tester | Used on a device, not in code |
| 8 | App Store Connect | Fill in **App Privacy** nutrition labels per [`privacy-declarations.md`](./privacy-declarations.md) | n/a — store-side only |
| 9 | Google Play Console | Create the app entry under `com.vybstak.auralens` | Used by `eas submit -p android` |
| 10 | Google Play Console | Create in-app product `auralens_instant_reading_099` (Managed → Consumable) — set Active | Already in `constants/products.ts` |
| 11 | Google Play Console | Create subscription `auralens_monthly_999` with base plan `monthly` — set Active | Already in `constants/products.ts` |
| 12 | Google Cloud Console | Create a service account, grant Service Account User in Play Console → Setup → API access, download JSON | Save as `./secrets/play-service-account.json` and reference in `eas.json` |
| 13 | Google Play Console | Internal Testing track: create release, add testers, share opt-in URL | Used on a device |
| 14 | Google Play Console | License Testing: add tester Google accounts | Used on a device |
| 15 | Google Play Console | Fill in **Data Safety** form per [`privacy-declarations.md`](./privacy-declarations.md) | n/a — store-side only |
| 16 | RevenueCat | Create project + add iOS app + Android app | Public SDK keys go into `.env*` as `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY` |
| 17 | RevenueCat | Paste App Store Connect API key (iOS) | Stored in RC only |
| 18 | RevenueCat | Paste Play service-account JSON (Android) | Stored in RC only |
| 19 | RevenueCat | Create products matching the two store IDs | One row per product per platform |
| 20 | RevenueCat | Create entitlement `monthly` → attach `auralens_monthly_999` (iOS + Android) | Already referenced as `ENTITLEMENTS.monthly` in `constants/products.ts` |
| 21 | RevenueCat | Create offering `default` with `$rc_lifetime` (single reading) + `$rc_monthly` packages | Read by `purchaseService.getDisplayOfferings()` |
| 22 | RevenueCat | (Optional) Configure webhook → Supabase `reconcile-entitlements` URL with a shared bearer secret | Header `Authorization: Bearer …` matches `REVENUECAT_WEBHOOK_AUTH` set on the function |
| 23 | Supabase | Create project, copy URL + anon key | `.env*` as `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| 24 | Supabase | `supabase link` then `supabase db push` to apply migrations | n/a — schema lives in `supabase/migrations/` |
| 25 | Supabase | Storage → create private bucket `reading-images` | RLS already wired by `002_rls_policies.sql` |
| 26 | Supabase | `supabase functions deploy ai-buddy` and `reconcile-entitlements` | Function source already in `supabase/functions/` |
| 27 | Supabase | `supabase secrets set AI_PROVIDER=… ANTHROPIC_API_KEY=… AI_MODEL=…` (or OpenAI) | Function-only secrets — never on device |
| 28 | Anthropic Console | Create an API key (sk-ant-…) | Used in step 27 |
| 29 | OpenAI Platform | Create an API key (sk-…) | Used in step 27 |
| 30 | Supabase | (Optional) Set `REVENUECAT_WEBHOOK_AUTH` for the reconcile function | n/a |

## What Claude can do in code (already done)

- Schema + RLS + storage policies
- Edge function code with full request pipeline + crisis guardrail
- Client SDK wiring (lazy-loaded, falls back if no key)
- Domain layer that turns raw RC outcomes into credit / entitlement state
- Reading sync (local-first, opt-in cloud, manual sync now)
- Photo upload gated on cloud sync + photo upload consent
- Delete-data flow with 5 granular paths
- App icon, splash, adaptive icon, favicon, 5 store screenshots
- EAS build profiles (development, preview, production)
- 65/65 unit tests
- Two verifier scripts (`verify:release`, `verify:integrations`)
- High-fidelity HTML preview gallery

## What Claude cannot do

- Click buttons in App Store Connect, Play Console, RevenueCat, Supabase
- Pay for an Apple Developer membership or a Google Play Console seat
- Receive an SMS / 2FA code to sign into your accounts
- Approve TestFlight reviewer access
- Commission final brand artwork
- Capture screenshots from a running native app
- Pay LLM provider invoices

Everything in this table is a 5–20 minute task per row in someone's dashboard. The verifier (`npm run verify:integrations -- --live=production`) will tell you when you've completed enough rows to ship.
