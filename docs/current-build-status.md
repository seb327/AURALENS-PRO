# Current build status

Investor-presentable snapshot. Honest, plain English.

**As of**: 2026-05-25 · Phase **2.6D** complete · ready to begin live integration

## What is already built (code-complete + verified)

- Full React Native + Expo + TypeScript app: 17 user-facing screens including hero, technology, pricing, scan, upload, processing, result, **reading detail**, **compare**, timeline, Aura Buddy, settings, privacy, delete-data, auth
- Deterministic Mien Shiang aura engine with 6 symbolic labels (Clear / Rising / Mixed / Shielded / Clouded / Heavy) and 7-zone breakdown
- Pluggable face analysis layer: native ML Kit when a dev build is available, heuristic JS fallback for Expo Go, mock for tests
- RevenueCat purchase abstraction with deferred credit consumption (credits only burn on successful readings)
- Supabase backend client + auth + opt-in cloud sync + private storage bucket + RLS-protected schema
- AI Aura Buddy edge function with Anthropic + OpenAI adapters, deterministic local fallback, pre + post crisis guardrail, rate limiting, server-side monthly entitlement check, forbidden-key rejection
- Root error boundary catching render crashes
- Premium brand system + generated PNG assets (icon, adaptive icon, splash, favicon) + 5 store screenshots with real headlines
- 7 high-fidelity HTML screen mockups for browser preview
- EAS build profiles: development, preview, production
- 4 dashboard docs + 6 integration docs + 5 founder-handoff docs

## Verification gates (all green)

| Gate | Status |
|---|---|
| `npm test` | 65/65 across 6 suites |
| `npx tsc --noEmit` | clean |
| `npx expo-doctor` | 17/17 |
| `npm run verify:release` | PASS 110 / 0 |
| `npm run verify:integrations` | PASS 53 / 0 (structural) |
| `npm run smoke:config` | enumerates all subsystem modes |

## What is running locally (today, no dashboards needed)

- `npm run preview` → http://localhost:4173 with the full HTML gallery, brand assets, store screenshots, outstanding-work panel
- `npx expo start` → the full app runs in Expo Go with:
  - Simulated RevenueCat purchases (mock entitlement unlocks)
  - Heuristic face analyzer (no ML Kit needed)
  - Deterministic local Aura Buddy fallback
  - Local-only reading history (cloud sync hidden in Settings)
- `npm test` → engine determinism, landmark mapping, face quality, purchase logic, reading sync, AI Buddy client + edge-function shared modules — all green

## What is mocked or in fallback mode (until dashboards are connected)

| Subsystem | Default mode | Switches to live when… |
|---|---|---|
| Supabase auth + sync | disabled (hidden in Settings) | `EXPO_PUBLIC_SUPABASE_*` filled and you sign in |
| Reading photo upload | never uploads | cloud sync **and** photo upload consent both toggled on |
| RevenueCat purchases | simulated mock unlocks | `REVENUECAT_*_KEY` filled and dev build includes `react-native-purchases` |
| Aura Buddy LLM | deterministic seeded reply | Supabase configured, user signed in with monthly, edge function deployed |
| Crisis guardrail | client-side pattern check only | server-side guardrail also runs once the edge function is live |
| Rate limiting | n/a (no server) | enforced once the edge function is live |
| Face landmarks | heuristic from JPEG size deltas | real ML Kit landmarks when `@react-native-ml-kit/face-detection` is added to a dev build |
| App icon / splash | generated geometry | replaced by final commissioned artwork (drop-in same PNG paths) |
| Store screenshots | mock UI compositions | replaced by real on-device captures |

## What is live-ready but not connected yet

Every piece of the live path has working code; only the dashboard wiring is missing:

- Real Supabase project, migrations applied, private bucket created
- Real RevenueCat project linked to App Store Connect + Play Console
- Real LLM key (Anthropic or OpenAI) set as a Supabase function secret
- Real EAS project id minted
- Real Apple Developer + Play Console product entries
- `eas submit` credentials configured (Apple ASC API key, Play service-account JSON)

The minimum dashboard work to flip every subsystem to live is documented step-by-step in [`START-HERE-LIVE-SETUP.md`](./START-HERE-LIVE-SETUP.md). Estimated time once accounts exist: **~90 minutes**.

## What requires real device testing

- Real money pathways: sandbox £1.99 + £7.99 purchases on iOS sandbox and Android License Tester accounts
- Restore Purchases against a freshly reinstalled binary
- Real camera + photo permissions on hardware
- Real ML Kit face landmarks on hardware (if added)
- Real Aura Buddy round-trip latency
- Real haptics + Reanimated frame budget
- App icon + adaptive icon rendering on actual home screens

All of this is enumerated in [`device-smoke-test.md`](./device-smoke-test.md) as a printable checklist.

## What cannot be confirmed until TestFlight / Play internal testing

- Apple privacy nutrition labels accepted on review
- Google Play Data Safety form accepted on review
- Reviewer flow on the £1.99 consumable and £7.99 auto-renewable
- TestFlight build distribution to internal testers
- Play internal track opt-in distribution
- App Store / Play screenshot acceptance (mock frames will need to be replaced first)

## Risk register (honest)

| Risk | Mitigation already in place |
|---|---|
| LLM provider deprecates a model | `AI_MODEL` is configurable per-secret; adapter is parameterised |
| RevenueCat outage | Local entitlement persists; reading history continues to work; only new purchases blocked |
| Supabase outage | App is local-first; readings continue, Aura Buddy falls back to local response |
| Apple/Google rejection on aura framing | All copy is store-safe and explicitly disclaimed; verifier blocks forbidden phrases |
| User in crisis types into Aura Buddy | Pre + post guardrails return regional resources without calling the LLM |
| Photo data leakage | Photos default to never upload; opt-in requires two toggles; bucket is private; RLS scoped per user |
| Server-only key leaks into client | `verify:integrations` greps client code; CI gate |

## What we are *not* doing yet (deferred to later phases)

- Sentry / crash reporting
- Privacy-respecting analytics
- OTA updates via `expo-updates`
- Tab navigation refactor (current flat router works)
- Accessibility audit (VoiceOver labels, Dynamic Type, contrast pass)
- Localisation infrastructure (English-only)
- Tablet-specific layouts
- Share-card image generation (currently text share)
- Final commissioned brand artwork

## The single next action

Open [`START-HERE-LIVE-SETUP.md`](./START-HERE-LIVE-SETUP.md) and start at **Step 1 — EAS**.
