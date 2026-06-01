# Google Play internal testing readiness

## Prerequisites
- Google Play Console developer account ($25 one-time)
- Admin access to the Play Console organisation

## Package name
- `com.vybstak.auralens` (production)
- `com.vybstak.auralens.preview` (preview)
- `com.vybstak.auralens.dev` (development client)

## Create the app
1. Play Console → *Create app*
2. App name: AuraLens · Default language: English (UK)
3. App or game: App · Free or paid: Free (in-app purchases)
4. Accept the developer programme declarations

## Internal testing track
1. *Testing → Internal testing → Create new release*
2. Upload the AAB from EAS (see *Build* below)
3. Save → Review release → Roll out to internal testing
4. *Testers* tab → Create email list → add internal testers → save the opt-in URL

Testers install via the opt-in URL on the Play Store; the build appears within minutes after rollout.

## In-app products
*Monetise → Products → In-app products → Create product*

| Product ID                         | Type                | Price       | Status |
|------------------------------------|---------------------|-------------|--------|
| `auralens_instant_reading_199`     | Consumable          | £1.99       | Active |

*Monetise → Products → Subscriptions → Create subscription*

| Subscription ID                | Base plan | Price        |
|--------------------------------|-----------|--------------|
| `auralens_monthly_799`         | `monthly` | £7.99/month  |

Both must be *Active* before testers can purchase.

## RevenueCat linking
- Add the Play service-account JSON in RevenueCat → *Project settings → Apps → Android*
- Attach both product IDs to the `default` Offering
- Attach the subscription to the `monthly` entitlement

## Data safety form
Play Console → *App content → Data safety*. Declare:

- *Data collected*: Email (account creation, optional), Photos (uploads, opt-in), Purchase history
- *Data shared with third parties*: None for marketing
- *Data is encrypted in transit*: Yes (HTTPS to Supabase, RevenueCat)
- *Users can request data deletion*: Yes — point to in-app *Settings → Delete My Data*
- *Personal info / Health / Location / Contacts*: None

## Build + upload

```bash
cp .env.production.example .env
# fill all values
eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

`eas submit` uses the service-account JSON path defined in `eas.json` (`./secrets/play-service-account.json`). Create the key in Google Cloud Console → IAM → Service Accounts → Keys, then grant *Service Account User* in Play Console → *Setup → API access*.

## Tester purchase testing
1. Play Console → *Setup → License testing → Add testers*
2. Testers sign in to the Play Store with those Google accounts
3. Open the app from the internal track and purchase — they are not charged

## Common errors
- **"Item not found"** — the in-app product is still in *Draft*. Activate it.
- **Package name mismatch** — `ANDROID_PACKAGE` in `.env` must match the Play Console app.
- **Signing issues** — let EAS manage the upload key (default). Don't overwrite with a local keystore unless you know what you're doing.
- **Service account 403** — re-grant *Service Account User* in Play Console after creating the key.
