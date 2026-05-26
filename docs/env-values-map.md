# Environment values map

The single source of truth for **every** environment variable used by AuraLens. If a variable is not in this table, it is not used.

Legend:
- **Client?** ✅ = safe to ship to the device · ❌ = server-only, must never appear in `.env` or `app.config.ts`
- **Local** = required to develop in Expo Go
- **Device** = required for a real dev build on hardware
- **Store** = required for a production TestFlight / Play submission

| Variable | Example format | Where to get it | Used by | Client? | Local | Device | Store |
|---|---|---|---|:--:|:--:|:--:|:--:|
| `APP_DISPLAY_NAME` | `AuraLens` | You choose | `app.config.ts` → `name` and `Constants.expoConfig.extra.appDisplayName` | ✅ | ⬜ optional | ✅ | ✅ |
| `APP_SLUG` | `auralens` | You choose | `app.config.ts` → `slug` + `scheme` | ✅ | ⬜ optional | ✅ | ✅ |
| `IOS_BUNDLE_ID` | `com.vybstak.auralens` | Apple Developer → Identifiers | `app.config.ts` → `ios.bundleIdentifier` | ✅ | ⬜ optional | ✅ | ✅ |
| `ANDROID_PACKAGE` | `com.vybstak.auralens` | You choose; mirror across Play Console | `app.config.ts` → `android.package` | ✅ | ⬜ optional | ✅ | ✅ |
| `APP_VERSION` | `0.1.0` | semver string | `app.config.ts` → `version` | ✅ | ⬜ optional | ✅ | ✅ |
| `IOS_BUILD_NUMBER` | `1` | integer | `app.config.ts` → `ios.buildNumber` | ✅ | ⬜ optional | ✅ | ✅ |
| `ANDROID_VERSION_CODE` | `1` | integer | `app.config.ts` → `android.versionCode` | ✅ | ⬜ optional | ✅ | ✅ |
| `EAS_PROJECT_ID` | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` | `eas init` | `app.config.ts` → `extra.eas.projectId` | ✅ | ⬜ optional | ✅ | ✅ |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://abcd.supabase.co` | Supabase → *Project Settings → API* | `services/supabase.ts` (lazy client) | ✅ | ⬜ optional | ✅ | ✅ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Same place | `services/supabase.ts` | ✅ | ⬜ optional | ✅ | ✅ |
| `REVENUECAT_IOS_KEY` | `appl_xxxxxxxxxxxx` | RevenueCat → *Project settings → API keys* (iOS) | `services/revenueCatService.ts` (via `Constants.expoConfig.extra`) | ✅ | ⬜ optional | ✅ | ✅ |
| `REVENUECAT_ANDROID_KEY` | `goog_xxxxxxxxxxxx` | Same place (Android) | `services/revenueCatService.ts` | ✅ | ⬜ optional | ✅ | ✅ |
| `AI_PROVIDER` | `anthropic` or `openai` | You choose | `supabase/functions/ai-buddy/index.ts` | ❌ | ⬜ | ⬜ (for live LLM) | ✅ |
| `AI_MODEL` | `claude-3-5-sonnet-latest` or `gpt-4o-mini` | Provider docs | `supabase/functions/_shared/aiProvider.ts` | ❌ | ⬜ | ⬜ (for live LLM) | ⬜ |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | https://console.anthropic.com | Anthropic adapter inside the edge function | ❌ | ⬜ | ⬜ (for live LLM) | ⬜ (one of the two) |
| `OPENAI_API_KEY` | `sk-...` | https://platform.openai.com | OpenAI adapter inside the edge function | ❌ | ⬜ | ⬜ (for live LLM) | ⬜ (one of the two) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` (service_role) | Supabase → *Project Settings → API* | Edge function only (auto-injected by Supabase runtime) | ❌ | ⬜ | ⬜ | ⬜ |
| `REVENUECAT_WEBHOOK_AUTH` | random secret | You generate, share with RC webhook | `reconcile-entitlements` edge function | ❌ | ⬜ | ⬜ | ⬜ optional |

## Where each kind of variable lives

```
DEVICE (.env, app.config.ts extra, EAS build env)
├── APP_*, IOS_*, ANDROID_*, APP_VERSION, EAS_PROJECT_ID  → identity
├── EXPO_PUBLIC_SUPABASE_*                                → read-only client SDK
└── REVENUECAT_*_KEY                                      → public SDK keys

SERVER (`supabase secrets set …`)
├── AI_PROVIDER + AI_MODEL                                → provider routing
├── ANTHROPIC_API_KEY / OPENAI_API_KEY                    → LLM credentials
├── SUPABASE_SERVICE_ROLE_KEY (auto-injected)             → trusted reads/writes
└── REVENUECAT_WEBHOOK_AUTH                               → webhook shared secret
```

## Hard rules

1. **Never** prefix a server-only variable with `EXPO_PUBLIC_`. Anything starting with `EXPO_PUBLIC_` is bundled into the app and shipped to every device.
2. **Never** check `.env` (or any `.env.*` except the `.example` files) into git. The `.gitignore` already excludes them.
3. **Never** put `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` into the app. They go on the edge function via `supabase secrets set` and **only** there. The integration verifier (`npm run verify:integrations`) will fail if it finds them in client code.
4. **Never** confuse the RevenueCat *public SDK key* (`appl_…`, `goog_…`) with the RevenueCat *secret API key* (used for server-side calls only). The codebase uses the public one.

## Verifying

```bash
npm run smoke:config         # prints which mode each subsystem will run in
npm run verify:integrations  # structural — no real secrets needed
npm run verify:integrations -- --live=development   # requires real values in .env.development
```
