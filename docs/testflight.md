# iOS TestFlight readiness

## Apple Developer prerequisites
- Active Apple Developer Program membership ($99/year)
- Admin access to App Store Connect

## Bundle identifier
- `com.vybstak.auralens` (production)
- `com.vybstak.auralens.preview` (preview)
- `com.vybstak.auralens.dev` (development client)

Register these in *Certificates, Identifiers & Profiles → Identifiers* once per id.

## Create the App Store Connect app
1. App Store Connect → *My Apps → +*
2. Platform: iOS · Name: AuraLens (or your chosen public name) · Primary language: English (UK)
3. Bundle ID: `com.vybstak.auralens` · SKU: `auralens-001`
4. After creation, set Category: *Lifestyle* (Primary) and *Health & Fitness* (Secondary, if applicable). Confirm with Apple's current guidance — wellbeing apps may also fit *Lifestyle* only.

## In-app purchases
Create both products under *Features → In-App Purchases*:

| Product ID                         | Type                          | Price |
|------------------------------------|-------------------------------|-------|
| `auralens_instant_reading_199`     | Consumable                    | £1.99 |
| `auralens_monthly_799`             | Auto-Renewable Subscription   | £7.99/month |

For the subscription:
- Subscription group: `auralens_main`
- Family sharing: off
- Subscription duration: 1 month
- Free trial / intro offers: optional (leave off for first submission)

Submit IAPs **for review** alongside (or before) the binary. They reach "Ready to Submit" without needing the binary uploaded.

## RevenueCat linking
- Add the App Store Connect API key (Issuer ID, Key ID, .p8) in RevenueCat → *Project settings → Apps → iOS*
- Attach both product IDs to the RevenueCat Offering `default`
- Attach `auralens_monthly_799` to the entitlement `monthly`

## Privacy nutrition labels
App Store Connect → *App Privacy*. Declare:

| Data type              | Linked to user | Used for tracking | Purpose                        |
|------------------------|----------------|-------------------|--------------------------------|
| Email address          | Yes (if opt-in)| No                | Account                        |
| Photos                 | Yes (if opt-in)| No                | App functionality (uploads)    |
| Other usage data       | Yes (if opt-in)| No                | Analytics — **none in Phase 2.5** |
| Purchase history       | Yes            | No                | App functionality              |

We do **not** declare *Sensitive Info*, *Health & Fitness*, *Contacts*, *Location*, or *Identifiers used for tracking*.

## Build + submit

```bash
cp .env.production.example .env
# fill all values
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

## TestFlight internal testing
1. App Store Connect → *TestFlight → Internal Testing → +*
2. Create a group e.g. `AuraLens Core`
3. Add internal users (must already be added in *Users and Access*)
4. Once the build finishes processing (≈10 min after upload), assign it to the group

## Sandbox purchase testing
1. App Store Connect → *Users and Access → Sandbox Testers → +*
2. On the test device: Settings → App Store → *Sandbox Account* → sign in with the sandbox tester
3. Launch the TestFlight build, hit *Try Now → Unlock One Reading* or *Start Monthly*
4. Confirm with the sandbox account; no money moves
5. Verify RevenueCat dashboard shows the customer with active entitlement

## Common errors
- **Missing Push Notification entitlement** — we don't request push in Phase 2.5; if Xcode complains, leave it disabled.
- **ITMS-90683 missing usage description** — both camera and photo usage strings are set in `app.config.ts`. If a build still fails, ensure `expo prebuild --clean` was not run with a stale config.
- **`ITSAppUsesNonExemptEncryption` warning** — already set to `false` in `app.config.ts`.
- **IAP not appearing in TestFlight** — IAP status must be *Ready to Submit* or *Approved*, not *Missing Metadata*.
