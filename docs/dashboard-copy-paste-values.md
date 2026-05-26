# Dashboard copy-paste values

Every exact string you'll need to paste into an external dashboard during live setup. Open this in a second tab while you click through the docs.

## App identifiers

| Field | Value |
|---|---|
| iOS bundle identifier (production) | `com.vybstak.auralens` |
| iOS bundle identifier (preview) | `com.vybstak.auralens.preview` |
| iOS bundle identifier (development) | `com.vybstak.auralens.dev` |
| Android package name (production) | `com.vybstak.auralens` |
| Android package name (preview) | `com.vybstak.auralens.preview` |
| Android package name (development) | `com.vybstak.auralens.dev` |
| iOS App SKU (App Store Connect) | `auralens-001` |

## App Store Connect

| Field | Value |
|---|---|
| App name | `AuraLens` *(or your final brand name)* |
| Primary language | English (U.K.) |
| Bundle ID | `com.vybstak.auralens` |
| Primary category | Lifestyle |
| Subtitle | `Symbolic aura readings, Mien Shiang inspired.` |
| Promotional text | `A calm, premium way to reflect on your day through a symbolic aura reading.` |
| Keywords (100 chars) | `aura,wellbeing,reflection,mindfulness,journalling,face reading,mien shiang,energy,calm,spiritual` |
| Age rating | 12+ |
| Support URL | `https://vybstak.com/auralens/support` *(replace with real URL)* |
| Marketing URL | `https://vybstak.com/auralens` *(replace)* |
| Privacy Policy URL | `https://vybstak.com/auralens/privacy` *(replace)* |

### In-app products

| Product ID | Type | Price | Reference name |
|---|---|---|---|
| `auralens_instant_reading_099` | Consumable | £0.99 | Instant Aura Reading |
| `auralens_monthly_999` | Auto-Renewable Subscription | £9.99/month | AuraLens Monthly |

Subscription group: `auralens_main` — duration 1 month.

## Google Play Console

| Field | Value |
|---|---|
| App name | `AuraLens` |
| Default language | English (UK) |
| App category | Lifestyle |
| Tags | Mindfulness, Personal Growth, Reflection |
| Short description (80 chars) | `Symbolic Mien Shiang-inspired aura reflections for spiritual wellbeing.` |
| Package name | `com.vybstak.auralens` |

### In-app products

| Product ID | Type | Price |
|---|---|---|
| `auralens_instant_reading_099` | Managed product · Consumable | £0.99 |
| `auralens_monthly_999` | Subscription · base plan `monthly` | £9.99/month |

## RevenueCat

| Field | Value |
|---|---|
| Project name | `AuraLens` |
| iOS app bundle ID | `com.vybstak.auralens` |
| Android package | `com.vybstak.auralens` |
| Entitlement identifier | `monthly` |
| Offering identifier | `default` |
| Package identifier (one-off) | `$rc_lifetime` (or any) — attach `auralens_instant_reading_099` |
| Package identifier (subscription) | `$rc_monthly` — attach `auralens_monthly_999` |

## Supabase

| Field | Value |
|---|---|
| Storage bucket | `reading-images` (PRIVATE — public: off) |
| Edge functions | `ai-buddy`, `reconcile-entitlements` |
| Required tables (auto-created by migration) | `profiles`, `readings`, `reading_images`, `entitlement_snapshots`, `ai_buddy_messages` |
| Object path format inside the bucket | `<user-id>/<reading-id>/<timestamp>.jpg` |

### Edge function secrets (`supabase secrets set …`)

| Secret | Example value | When required |
|---|---|---|
| `AI_PROVIDER` | `anthropic` or `openai` | for live LLM |
| `AI_MODEL` | `claude-3-5-sonnet-latest` or `gpt-4o-mini` | for live LLM |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | if `AI_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | `sk-...` | if `AI_PROVIDER=openai` |
| `REVENUECAT_WEBHOOK_AUTH` | random 32+ char string | optional, for the reconcile webhook |

## Suggested App Store full description (store-safe)

```
AuraLens offers symbolic Mien Shiang-inspired aura reflections for spiritual
wellbeing, journalling, and self-awareness.

Take a front-camera scan, or upload three photos from different chapters of
your life. AuraLens analyses facial landmark geometry, expression balance,
lighting, and seven symbolic zones to generate a calm, grounded reflection.

— Instant aura reading (£0.99) — one symbolic reading, no tokens, no hidden credits
— AuraLens Monthly (£9.99/month) — unlimited readings, aura timeline, AI Aura Buddy

Every reading is for reflection and wellbeing only. AuraLens is not medical,
psychological, or diagnostic advice.
```

## Subscription and purchase explanation (required in listing + in-app)

```
AuraLens Monthly — £9.99/month
Auto-renews every month until cancelled. Manage or cancel any time in your
App Store or Google Play account. The instant reading is a one-time
in-app purchase and is consumed when the reading is generated.
```

## What you must NOT type into any dashboard

- ❌ "scientifically proven aura"
- ❌ "100% accurate" / "absolute accuracy"
- ❌ "biometric identity verification"
- ❌ "diagnoses depression / anxiety / mental illness"
- ❌ "predicts your destiny"
- ❌ "guaranteed result"
- ❌ Anything else from the forbidden-claims list in [`brand-guide.md`](./brand-guide.md)

The release verifier greps the codebase and listing copy for affirmative misuses of these phrases. Apple and Google will reject the binary if they see them in your store listing.
