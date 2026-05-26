# AuraLens — current progress preview

> **Product**: AuraLens by Vybstak (working name — configurable via `APP_DISPLAY_NAME`)
> **Current phase**: 2.6C — Substance pass on top of brand polish + preview pack
> **Date**: 2026-05-25

This document is the single page to share with reviewers or stakeholders when they ask *"where is AuraLens right now?"*. Pair it with [`preview-gallery.md`](./preview-gallery.md) for the visuals.

---

## Verification snapshot

Every number below comes from the most recent local run (`npm test`, `npx tsc --noEmit`, `npx expo-doctor`, `npm run verify:release`).

| Check                | Status        | Detail                              |
|----------------------|---------------|-------------------------------------|
| Build status         | ✅ OK         | `expo-doctor` 17/17                 |
| TypeScript           | ✅ Clean      | `tsc --noEmit` zero errors          |
| Tests                | ✅ 65/65      | 6 suites — engine, landmarks, **compare**, purchase, readingSync, aiBuddy |
| Release verifier     | ✅ PASS 110   | files, asset dimensions, screenshot copy, app.config asset paths, server-only key leaks, forbidden marketing copy |
| App.config           | ✅ Loads      | permission strings, adaptive icon, icon, splash, favicon |
| EAS profiles         | ✅ Defined    | `development`, `preview`, `production` |
| Brand assets         | ✅ Generated  | icon, adaptive icon, splash, favicon, 5 store screenshots |
| Preview pack         | ✅ Generated  | 4 PNG sheets + 7 high-fidelity HTML mockups in `assets/preview/` |
| Error boundary       | ✅ Root level | Render-crash fallback                |

---

## Implemented features

### Onboarding & marketing flow
- Hero screen with floating aura orb, particle field, hero copy
- Technology page explaining face zones, landmark geometry, aura pattern mapping, AI guidance
- Privacy-first section with consent statements
- Pricing screen with live RevenueCat prices (fallback `£0.99` / `£9.99/month`)

### Reading engine (local + deterministic)
- Six-tier symbolic aura labels: **Clear / Rising / Mixed / Shielded / Clouded / Heavy**
- Deterministic seeded scoring — identical inputs always produce identical readings
- Confidence + rescan logic
- Mien Shiang zone scoring across 7 zones
- Disclaimer attached to every reading

### Face analysis abstraction
- Pluggable `FaceAnalyzer` registry: **native** (ML Kit in dev build), **heuristic** (Expo Go safe via `expo-image-manipulator`), **mock** (tests)
- 10 issue tags + pose damping so a side-angle face cannot claim a Clear Aura

### Camera + upload
- Front-camera capture via `expo-camera`
- 3-photo upload via `expo-image-picker`
- Credit consumed **only on success**

### Reading result + history *(updated in 2.6C)*
- Premium glass UI with the user's aura orb on the result page
- Label, score (0–100), dominant + secondary colour, element, confidence
- Mien Shiang zone breakdown
- **NEW** `app/reading/[id].tsx` — tap any saved reading from the timeline to reopen it with full guidance, delete, Ask Aura Buddy, Compare
- **NEW** `app/compare.tsx` — Then vs Now screen with side-by-side aura orbs, zone deltas, natural-language summary

### Monthly tier features
- **Aura Timeline** — local + cloud-merged history with Sync Now; rows now tappable, Compare CTA when ≥2 saved
- **Aura Buddy** — real LLM via Supabase Edge Function (Anthropic / OpenAI / safe local fallback)
- **Compare** — pure engine (`engine/compareReadings.ts`) computes per-zone deltas, strongest improvement / largest decline, and a calm narrative summary

### Settings
- Plan, reading credits, saved-reading count, billing-configured flag
- Account (sign in / out, account-optional)
- Cloud sync + photo upload consent toggles
- Sync Now + last-sync line
- Restore Purchases, Refresh Subscription Status, Manage Subscription deep link
- Aura Buddy history count + Clear
- Privacy + Delete My Data links
- Dev-only debug panel

### Privacy & deletion
- Privacy screen with 7 explicit sections
- Delete My Data with 5 granular paths

### Reliability *(new in 2.6C)*
- **Root-level `ErrorBoundary`** — render crashes show a calm fallback with retry instead of a red screen

---

## Backend status

| System         | Status              | Notes                                           |
|----------------|---------------------|-------------------------------------------------|
| Supabase auth  | ✅ Email/password + magic link | Lazy client, disabled without keys     |
| Database schema| ✅ 5 tables + RLS   | profiles, readings, reading_images, entitlement_snapshots, ai_buddy_messages |
| Storage bucket | ✅ Private `reading-images` | Signed-URL-only access                  |
| Sync           | ✅ Local-first, opt-in | Push on save + manual Sync Now              |
| Edge functions | ✅ ai-buddy live, reconcile-entitlements stub | Anthropic + OpenAI + fallback |

---

## Payment status

| System         | Status              | Notes                                           |
|----------------|---------------------|-------------------------------------------------|
| RevenueCat     | ✅ Wired (lazy)     | Dev mock when no key; real SDK in dev build     |
| Products       | ✅ Defined          | `auralens_instant_reading_099`, `auralens_monthly_999` |
| Entitlement    | ✅ Server-mirrored  | Pushed to `entitlement_snapshots` on every change |
| Restore        | ✅ Implemented      | Surfaces subscription state, explains consumables |
| Stripe         | ❌ Not in native    | By design — App Store + Play Billing only       |

---

## AI Aura Buddy status

| Concern                          | Status |
|----------------------------------|--------|
| LLM integration                  | ✅ Anthropic + OpenAI adapters |
| Local fallback                   | ✅ Deterministic seeded response |
| Crisis guardrail (pre + post)    | ✅ Categorised: self-harm, harm-others, abuse, immediate-danger |
| Regional crisis resources        | ✅ UK 116 123 / US 988 / AU 13 11 14 |
| Rate limiting                    | ✅ 40 messages / 24h per user |
| Server-side monthly gate         | ✅ Reads latest `entitlement_snapshots` row |
| Forbidden key rejection          | ✅ Client + server (root + nested) |

---

## Privacy & compliance status

- ✅ Local-first default — no account needed to scan
- ✅ Camera + photo permission strings store-final
- ✅ Cloud sync opt-in; photo upload opt-in (requires cloud sync)
- ✅ Row-Level Security on every cloud table
- ✅ Private storage bucket — signed URLs only
- ✅ Six-tier aura labels — "bad" softened to **Heavy** / **Clouded**
- ✅ No medical, psychological, diagnostic, or scientific claims anywhere in source
- ✅ `npm run verify:release` greps the source for nine forbidden marketing patterns
- ✅ No server-only LLM keys referenced in client code (enforced by verifier)

---

## App store readiness

| Item                                | Status      |
|-------------------------------------|-------------|
| `eas.json` profiles                 | ✅ Defined  |
| `app.config.ts` bundle ids + versioning | ✅ Configurable via env |
| iOS permission strings              | ✅ Store-final |
| Android adaptive icon               | ✅ Wired    |
| Splash + icon + favicon             | ✅ Generated PNGs at correct dimensions |
| Store screenshots                   | ✅ 5 × 1290×2796 with real headlines |
| Listing copy draft                  | ✅ App Store + Play |
| Privacy declarations doc            | ✅ Source of truth for nutrition labels + Data Safety |
| QA test plan                        | ✅ 80-item checklist |
| Release verifier                    | ✅ `npm run verify:release` |

---

## Remaining manual steps (you, not me)

### External dashboards (CONFIG)
1. `eas init` to mint and store a real `EAS_PROJECT_ID`
2. Register iOS bundle IDs and Android package names with Apple / Google
3. Create App Store Connect app + the two in-app products
4. Create Play Console app + internal track + the two in-app products
5. Create RevenueCat project, link both store API keys, attach products to `default` offering and `monthly` entitlement
6. Deploy Supabase: `supabase db push`, create `reading-images` private bucket
7. `supabase functions deploy ai-buddy` + `supabase secrets set AI_PROVIDER=… ANTHROPIC_API_KEY=…`
8. Replace `REPLACE_WITH_*` strings in `eas.json` submit profile, drop `./secrets/play-service-account.json`
9. Fill `.env.production` from `.env.production.example`

### Design / artwork
10. Commission and drop final brand artwork over `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png` (keep dimensions; the brand guide locks the composition)
11. Capture real in-app screenshots from a production build to replace the mock store frames
12. Confirm wordmark + legal sign-off on the public-facing name

### Real-device verification (DEVICE)
13. iOS hardware test via TestFlight — first sandbox IAP, first real LLM round-trip
14. Android hardware test via Play internal — first sandbox IAP
15. Walk the 80-item QA test plan on real devices

---

## How to run locally

### Quick start (Expo Go, no native modules, fully offline)

```bash
cd auralens
npm install
npx expo start
# press i for iOS simulator, a for Android emulator, or scan QR with Expo Go
```

In this mode:
- Purchases are simulated (mock RevenueCat)
- Face analysis uses the heuristic analyzer (no ML Kit)
- Aura Buddy uses a deterministic local fallback
- Cloud sync is hidden in Settings (no `EXPO_PUBLIC_SUPABASE_URL`)

### Visual preview in browser (no Expo install needed)

```bash
npm run preview
# open http://localhost:4173/
```

You get: 7 high-fidelity HTML screen mockups at iPhone 14/15 viewport, the 4 PNG preview sheets, all 5 store screenshots, all 4 brand asset files, the live verification gates, and the full outstanding-work list.

### Development build (real native modules on a real device)

```bash
cp .env.development.example .env
# fill values you want active

npx expo install react-native-purchases                 # for real IAP
npx expo install @react-native-ml-kit/face-detection    # for real landmarks

npx eas build --profile development --platform ios
npx eas build --profile development --platform android
npx expo start --dev-client
```

### Verification gates

```bash
npm install
npm test                  # 65/65
npx tsc --noEmit          # clean
npx expo-doctor           # 17/17
npm run verify:release    # 110 / 0
npm run generate:assets   # regenerate branded PNGs
npm run generate:preview  # regenerate this preview pack
npm run preview           # serve the gallery on localhost:4173
```
