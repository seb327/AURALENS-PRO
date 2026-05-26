# START HERE — Live setup (founder edition)

This is the only document you need open while you wire AuraLens to real services. Work the steps in order. Each step ends with a *"How you know it worked"* check and *"Don't"* gotcha.

Estimated total time once accounts exist: **~90 minutes**.

Before you start:
```bash
cd auralens
npm install
npm test            # must show 65/65
npm run verify:release       # must show PASS 110 / 0
npm run verify:integrations  # must show PASS 53 / 0 (structural)
```
If any fail, do not start dashboard work. Fix first.

---

## STEP 1 — EAS

**Go to** https://expo.dev → sign up / sign in.

**Then run:**
```bash
npm i -g eas-cli
eas login
eas init
```

When `eas init` finishes, it prints a project id like `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`.

**Where it goes:** copy that id into `.env`:
```
EAS_PROJECT_ID=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

**How you know it worked:** `eas project:info` prints your project. `npm run smoke:config` shows `EAS project: CONFIGURED`.

**Don't:** use someone else's project id from a different app.

---

## STEP 2 — Supabase

**Go to** https://app.supabase.com → **New project**.

- Region: closest to your users
- DB password: strong, save in 1Password / Bitwarden
- Wait ~2 min

When ready, open **Project settings → API** and copy two values:
- Project URL → goes in `EXPO_PUBLIC_SUPABASE_URL`
- `anon` `public` key → goes in `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Then run:**
```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>     # ref is the xxxx in xxxx.supabase.co
supabase db push                                    # applies 001_initial_schema.sql + 002_rls_policies.sql
```

Then in the Supabase dashboard → **Storage** → **New bucket**:
- Name: `reading-images`
- Public: **off**

Then deploy the edge functions:
```bash
supabase functions deploy reconcile-entitlements --no-verify-jwt
supabase functions deploy ai-buddy
```

**How you know it worked:**
- SQL editor: `select count(*) from public.readings;` returns 0 (not an error)
- Storage: you see `reading-images` listed as private
- Functions: both appear in *Edge Functions* tab as "deployed"

**Don't:** make the storage bucket public. The whole privacy model breaks. RLS policies are wired to a private bucket only.

> Full step-by-step: [`supabase-live-deployment.md`](./supabase-live-deployment.md)

---

## STEP 3 — Anthropic OR OpenAI (pick one)

This key is **server-side only**. It goes on the edge function, **never** in the app.

**Anthropic** (recommended): https://console.anthropic.com → API Keys → Create key → starts `sk-ant-...`

**OpenAI**: https://platform.openai.com → API keys → Create new secret key → starts `sk-...`

**Then run:**
```bash
# Anthropic
supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... AI_MODEL=claude-3-5-sonnet-latest

# OR OpenAI
supabase secrets set AI_PROVIDER=openai OPENAI_API_KEY=sk-... AI_MODEL=gpt-4o-mini
```

**How you know it worked:** `supabase secrets list` shows your variables (values are hidden).

**Don't:** put `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` into `.env`. The integration verifier will fail your build if it sees them in client code.

---

## STEP 4 — Apple Developer + App Store Connect

You need an active Apple Developer Program membership ($99/yr).

### 4a. Register the bundle id
https://developer.apple.com → *Certificates, Identifiers & Profiles → Identifiers → +*
- Type: App IDs
- Bundle ID: **`com.vybstak.auralens`** (exact)

### 4b. Create the App Store Connect entry
https://appstoreconnect.apple.com → *My Apps → +*
- Platform: iOS
- Name: AuraLens
- Bundle ID: pick the one you just registered
- SKU: `auralens-001`

### 4c. Create the two in-app products
*Features → In-App Purchases → +*

| Type | Product ID | Price |
|------|------------|-------|
| Consumable | `auralens_instant_reading_099` | £0.99 |
| Auto-Renewable Subscription | `auralens_monthly_999` | £9.99/month |

For the subscription, create subscription group `auralens_main`, duration 1 month.

### 4d. Create an API key for RevenueCat
*Users and Access → Integrations → App Store Connect API → Create key*
- Access: Admin
- Download the `.p8` file (one chance!)
- Note the Issuer ID and Key ID

### 4e. Create a Sandbox Tester
*Users and Access → Sandbox Testers → +*
- Use an email **not** already an Apple ID

**How you know it worked:** the app entry appears in My Apps; both products show *Missing Metadata* status (this is fine — we don't need approval yet).

**Don't:** delete the `.p8` file — Apple won't let you re-download it.

---

## STEP 5 — Google Play Console

You need a Play Console developer account ($25 one-time).

### 5a. Create the app
https://play.google.com/console → *Create app*
- App name: AuraLens
- Free or paid: Free (with in-app purchases)
- Accept all declarations

### 5b. Set the package name
*Setup → App details* — confirm `com.vybstak.auralens` (set when you upload your first AAB).

### 5c. Create the two products

*Monetise → Products → In-app products → Create product*
- Product ID: `auralens_instant_reading_099` · Type: Managed product · Consumable
- Price: £0.99 · Status: **Active**

*Monetise → Products → Subscriptions → Create subscription*
- Product ID: `auralens_monthly_999` · Base plan ID: `monthly` · Price: £9.99/month · Status: **Active**

### 5d. Internal testing track
*Testing → Internal testing → Create new release* (you'll upload an AAB here later)
*Testers tab → Create email list* → add yourself → save opt-in URL

### 5e. License testers
*Setup → License testing → Add testers* (add your test Google account)

### 5f. Service account for `eas submit`
1. https://console.cloud.google.com → IAM → Service Accounts → Create
2. Grant **Service Account User** role
3. Create JSON key → download it
4. Play Console → *Setup → API access* → grant the service account access
5. Save the file as `./secrets/play-service-account.json` (referenced by `eas.json`)

**How you know it worked:** opt-in URL is generated; license tester email shows in the list.

**Don't:** commit the service account JSON to git. The `.gitignore` already excludes `secrets/`.

---

## STEP 6 — RevenueCat

https://app.revenuecat.com → **New project** → AuraLens

### 6a. Add iOS app
*Project settings → Apps → Add → App Store*
- Bundle ID: `com.vybstak.auralens`
- Paste the ASC API key from step 4d (Issuer ID, Key ID, `.p8`)

### 6b. Add Android app
*Project settings → Apps → Add → Play Store*
- Package: `com.vybstak.auralens`
- Paste the service-account JSON from step 5f

### 6c. Create products
*Products → New* — create one row per platform per product ID:
- iOS `auralens_instant_reading_099`
- Android `auralens_instant_reading_099`
- iOS `auralens_monthly_999`
- Android `auralens_monthly_999`

### 6d. Create the `monthly` entitlement
*Entitlements → New* → identifier `monthly` → attach both `auralens_monthly_999` products

### 6e. Create the `default` offering
*Offerings → default → Packages → New*:
- `$rc_lifetime` → attach the `auralens_instant_reading_099` products
- `$rc_monthly` → attach the `auralens_monthly_999` products

### 6f. Grab the SDK keys
*Project settings → API keys* — copy:
- iOS public SDK key (starts `appl_`) → `REVENUECAT_IOS_KEY`
- Android public SDK key (starts `goog_`) → `REVENUECAT_ANDROID_KEY`

**How you know it worked:** both apps show *Connected* in RevenueCat.

**Don't:** mix up *public* SDK keys with *secret* API keys. Only the public ones go in `.env`.

---

## STEP 7 — Local `.env`

Copy the development template and fill it:

```bash
cd auralens
cp .env.development.example .env
```

Open `.env` and set:
```
APP_DISPLAY_NAME=AuraLens
APP_SLUG=auralens
IOS_BUNDLE_ID=com.vybstak.auralens
ANDROID_PACKAGE=com.vybstak.auralens
EAS_PROJECT_ID=<from step 1>
EXPO_PUBLIC_SUPABASE_URL=<from step 2>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from step 2>
REVENUECAT_IOS_KEY=<from step 6f>
REVENUECAT_ANDROID_KEY=<from step 6f>
```

**How you know it worked:**
```bash
npm run smoke:config
```
Every subsystem should report `LIVE` or `CONFIGURED`, none should say `MOCK` or `UNCONFIGURED`.

**Don't:** ever paste `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` into `.env`. Those are server-only.

---

## STEP 8 — Live verification

Run all six gates, this time in live mode:

```bash
npm install
npm test
npx tsc --noEmit
npx expo-doctor
npm run verify:release
npm run verify:integrations -- --live=development
```

Expected: every line ends with PASS / clean / 17/17 / 65/65.

**Don't:** proceed if any gate fails. Re-read the failing message — almost always a missing or placeholder env value.

---

## STEP 9 — iOS development build

```bash
npx expo install react-native-purchases                     # adds the live IAP SDK
npx expo install @react-native-ml-kit/face-detection         # adds real face landmarks (optional)
eas build --profile development --platform ios
```

Wait ~10 min for the EAS build. When it's done you get a build link.

**How you know it worked:** open the link on your iOS device → install → app icon appears → splash shows the orb → hero loads.

**Don't:** install via Expo Go after this step. The dev-client build is now your runtime. Use `npx expo start --dev-client`.

---

## STEP 10 — Android development build

```bash
eas build --profile development --platform android
```

EAS gives you a build link or an APK. Install via:
- Play internal testing track (preferred), or
- Direct APK install with developer mode on

**How you know it worked:** app icon appears on launcher; opening it shows the obsidian + orb splash.

**Don't:** try to test in-app purchases without signing into the device with a Google account that is on the License Testers list.

---

## STEP 11 — Real-device smoke test

Print [`device-smoke-test.md`](./device-smoke-test.md). Walk every box on both an iOS and an Android device. The tests prove:

1. Sandbox IAP works (£0.99 + £9.99)
2. Refund safety: a failed reading does **not** consume a credit
3. Supabase sync writes real rows
4. Photo upload (opt-in) lands in the private bucket
5. Aura Buddy calls the real LLM and returns a structured reply
6. Crisis guardrail short-circuits before the LLM (verifiable with `[crisis_guardrail_triggered]` row)
7. Delete-data wipes local + cloud + storage
8. Error boundary catches a forced crash

**When every box is ticked, you are ready to upload a TestFlight build / Play internal release.**

---

## If you get stuck

| Symptom | Most likely cause | Fix |
|---|---|---|
| `eas init` fails with "permission" | wrong Expo account | `eas logout` then `eas login` |
| `supabase db push` errors with "schema already exists" | migrations already applied | safe to ignore, or `supabase db reset` if dev only |
| App still shows "RevenueCat is not configured" dev banner | `.env` not set, or you're still in Expo Go | rebuild with `eas build --profile development` and use `--dev-client` |
| Aura Buddy returns the local fallback every time | function not deployed, or you're not signed in, or your monthly entitlement snapshot is missing | step 2 (deploy), step 11 (sign in), step 6d (entitlement) |
| Sandbox purchase fails on iOS | wrong Apple ID signed in | Settings.app → App Store → *Sandbox Account* → sign in with the tester |
| Sandbox purchase fails on Android | tester not in License Testers + Internal Track | step 5d + 5e |
| `verify:integrations --live=development` fails | `.env` has placeholder or empty values | re-check step 7 |

Full reference docs:
- [`supabase-live-deployment.md`](./supabase-live-deployment.md)
- [`revenuecat-sandbox-test.md`](./revenuecat-sandbox-test.md)
- [`llm-live-test.md`](./llm-live-test.md)
- [`device-smoke-test.md`](./device-smoke-test.md)
- [`manual-dashboard-steps.md`](./manual-dashboard-steps.md)
- [`env-values-map.md`](./env-values-map.md)
- [`dashboard-copy-paste-values.md`](./dashboard-copy-paste-values.md)
- [`current-build-status.md`](./current-build-status.md)
- [`post-dashboard-verification.md`](./post-dashboard-verification.md)
