# RevenueCat sandbox test

Goal: prove that the £1.99 instant reading and £7.99/month subscription unlock the right entitlements in sandbox, on real devices. Estimated time: 45 minutes the first time (most of it is App Store Connect / Play Console waiting).

## Prerequisites
- App Store Connect access (Apple Developer Program)
- Google Play Console access
- RevenueCat account
- An iOS device + a Sandbox Tester
- An Android device + a Play License Tester

## 1. Create the RevenueCat project
1. https://app.revenuecat.com → **New project** → AuraLens
2. **Project settings → API keys** — copy:
   - iOS public SDK key (starts `appl_`)
   - Android public SDK key (starts `goog_`)

## 2. Configure the iOS app
1. RevenueCat → *Project settings → Apps → Add → App Store*
2. Bundle id: `com.vybstak.auralens` (or `.preview` if you're starting with preview)
3. App Store Connect API key:
   - https://appstoreconnect.apple.com → *Users and Access → Integrations → App Store Connect API* → Create key
   - Grant **Admin** or **App Manager**
   - Paste Issuer ID, Key ID, and the `.p8` file into RevenueCat
4. Verify "Connected" status in RevenueCat

## 3. Configure the Android app
1. RevenueCat → *Project settings → Apps → Add → Play Store*
2. Package: `com.vybstak.auralens`
3. Service account JSON:
   - Google Cloud → IAM → Service Accounts → create one
   - Add **Service Account User** role
   - Create a JSON key
   - Play Console → *Setup → API access* → grant access to the service account
   - Paste the JSON into RevenueCat
4. Verify "Connected" status

## 4. Create the products in the stores

### App Store Connect
*Features → In-App Purchases → +*

| Product ID                          | Type                            | Price |
|-------------------------------------|---------------------------------|-------|
| `auralens_instant_reading_199`      | Consumable                      | £1.99 |
| `auralens_monthly_799`              | Auto-Renewable Subscription     | £7.99/month |

For the subscription:
- Subscription group: `auralens_main`
- Duration: 1 month
- Submit for review (or leave as *Ready to Submit*)

### Google Play Console
- *Monetise → Products → In-app products*: `auralens_instant_reading_199` (Managed, Consumable)
- *Monetise → Products → Subscriptions*: `auralens_monthly_799` with a `monthly` base plan
- Set both to **Active**

## 5. Wire products in RevenueCat
1. RevenueCat → *Products → New* — add both product IDs (separate rows for iOS + Android)
2. *Entitlements → New* → `monthly` → attach `auralens_monthly_799` (iOS + Android)
3. *Offerings → default → Packages → New*:
   - `$rc_lifetime` → `auralens_instant_reading_199`
   - `$rc_monthly` → `auralens_monthly_799`

## 6. Add the keys to AuraLens
```bash
# .env (or .env.development for dev builds)
REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxx
REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxx
```

## 7. Add the SDK to a dev build
```bash
npx expo install react-native-purchases
eas build --profile development --platform ios
# or android
```

Run the dev build (`npx expo start --dev-client`). On the Pricing screen the "RevenueCat is not configured" dev banner should disappear.

## 8. Create sandbox testers

### Apple
1. App Store Connect → *Users and Access → Sandbox Testers → +*
2. Use an email **not** tied to any real Apple ID
3. On the device: Settings → App Store → *Sandbox Account* → sign in

### Google
1. Play Console → *Setup → License testing → Add testers*
2. Add the Google account you'll sign in with on the test device
3. Make sure that account is also on the internal testing track opt-in list

## 9. Test one-off purchase
1. Open the dev build → Try Now → Pricing → *Unlock One Reading*
2. iOS: confirm with the sandbox Apple ID
3. Android: confirm — should say "This is a test purchase"
4. Expected:
   - App pushes to /scan
   - Settings → Reading credits: **1**
   - Settings → Plan: *Single readings*
   - RevenueCat dashboard → Customers shows the device's anonymous ID with `auralens_instant_reading_199` in non-subscription transactions

## 10. Test successful reading consumes one credit
1. Complete a scan
2. After the result screen renders:
   - Settings → Reading credits: **0**
   - Saved readings: **1**

## 11. Test failed-reading refund safety
1. Buy another single reading
2. Start a scan and deliberately produce a blurry/no-face image (cover the lens)
3. Processing should bounce back to /scan with a rescan message
4. Verify Settings → Reading credits: **1** (still, because the engine never produced a result)

## 12. Test monthly subscription
1. Pricing → *Start Monthly*
2. Confirm sandbox purchase
3. Expected:
   - Settings → Plan: **Monthly**
   - Timeline + Aura Buddy unlock
   - Subscription appears in RevenueCat → Customers with entitlement `monthly` active

## 13. Test restore purchases
1. Sign out of the app (Settings → Sign Out) — or delete the app and reinstall
2. Open the app → Settings → *Restore Purchases*
3. Expected:
   - Alert: *"Your monthly subscription is active again."*
   - `hasMonthly` back to true
   - Note: **consumables are not restored** — App Store and Play do not preserve consumable purchases. The Restore alert spells this out.

## 14. Verify entitlement snapshot
After any purchase, an entitlement snapshot is mirrored to Supabase (advisory; RC remains the source of truth):

```sql
select user_id, has_monthly, reading_credits, active_product_ids, last_synced_at
  from public.entitlement_snapshots
  order by last_synced_at desc limit 5;
```

## 15. Final structural check
```bash
npm run verify:integrations -- --live=development
```
