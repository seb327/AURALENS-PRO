# Stripe setup (web/PWA monetisation)

AuraLens monetises via **Stripe Checkout** hosted on the Railway server. The mobile/web client never holds the Stripe secret — it asks Railway to create a Checkout Session and opens the returned URL. Stripe handles all card data (PCI out of scope). A signed webhook posts back to Railway, which writes the entitlement to Supabase.

Time to first dollar: **2-5 days from a blank Stripe account**.

## Architecture

```
[Mobile/Web client]
    │  1. POST /checkout/session   (Bearer: Supabase JWT)
    ▼
[Railway server]
    │  2. Stripe.checkout.sessions.create
    ▼
[Stripe Checkout (hosted by Stripe)]
    │  3. User pays
    │  4. Stripe redirects user → returnUrl?checkout=success
    │  5. Stripe POSTs webhook → /webhook/stripe (signed)
    ▼
[Railway server]
    │  6. Verify signature, write entitlement_snapshots row
    ▼
[Supabase]
    │  7. Mobile/web client refreshes entitlement
    ▼
[App unlocks features]
```

## Required Railway env vars

| Variable | Value | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` (test) or `sk_live_…` (production) | Stripe dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Stripe dashboard → Developers → Webhooks → your endpoint → Signing secret |
| `STRIPE_PRICE_SINGLE` | `price_…` for the £1.99 one-off | Stripe dashboard → Products → Instant Aura Reading → Price ID |
| `STRIPE_PRICE_MONTHLY` | `price_…` for the £7.99/month subscription | Stripe dashboard → Products → AuraLens Monthly → Price ID |
| `SUPABASE_URL` | (already set for Aura Buddy) | — |
| `SUPABASE_ANON_KEY` | (already set) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | (already set) | — |

**Do not** put any `sk_…` / `whsec_…` / `rk_…` in `.env`, `.env.development`, or any other file loaded by Expo. The mobile binary cannot contain them. `npm run verify:integrations` will fail if it sees these patterns in any `EXPO_PUBLIC_*` slot.

## Required client env var

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` or `pk_live_…` (Stripe dashboard → Developers → API keys → Publishable key). Safe to ship to clients. |
| `EXPO_PUBLIC_AI_BUDDY_URL` | The same Railway URL the Aura Buddy uses — Stripe endpoints live on the same server. |

## Stripe dashboard setup (one-time, ~10 min)

### 1. Create the two products

https://dashboard.stripe.com/test/products

**Product 1: Instant Aura Reading**
- Name: `Instant Aura Reading`
- Description: `One symbolic Mien Shiang-inspired aura reading`
- Pricing model: **Standard pricing**
- Price: **£1.99 GBP** · **One time**
- Click Save · copy the **Price ID** (`price_…`) → goes in `STRIPE_PRICE_SINGLE`

**Product 2: AuraLens Monthly**
- Name: `AuraLens Monthly`
- Description: `Unlimited symbolic readings, aura timeline, AI Aura Buddy`
- Pricing model: **Standard pricing**
- Price: **£7.99 GBP** · **Recurring** · **Monthly**
- Click Save · copy the **Price ID** (`price_…`) → goes in `STRIPE_PRICE_MONTHLY`

### 2. Create the webhook endpoint

https://dashboard.stripe.com/test/webhooks → **Add endpoint**

- Endpoint URL: `https://<your-railway-app>.up.railway.app/webhook/stripe`
- Events to send (4):
  - `checkout.session.completed`
  - `invoice.paid`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Click Add endpoint
- On the endpoint detail page, click **Reveal signing secret** → copy the `whsec_…` value → goes in `STRIPE_WEBHOOK_SECRET`

### 3. Set Railway env vars

In the Railway dashboard for your project → **Variables**:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SINGLE=price_...
STRIPE_PRICE_MONTHLY=price_...
```

Railway redeploys automatically.

### 4. Set client env var

In `.env` (local) or your EAS build profile:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Already set if you've done Step 7 of `START-HERE-LIVE-SETUP.md`:
```
EXPO_PUBLIC_AI_BUDDY_URL=https://<your-railway-app>.up.railway.app
```

## Smoke test the full flow

### A. Health check the server
```bash
curl https://<your-railway-app>.up.railway.app/health
```
Look for `"stripe": { "stripe": true, "webhook": true, "prices": true }` — all three must be true before a real purchase can happen.

### B. Create a checkout session
```bash
# Get a Supabase user JWT (Supabase dashboard → Auth → user → … → Send magic link → grab access_token)
curl -X POST https://<railway>/checkout/session \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"single","returnUrl":"http://localhost:8090/"}'
```
Expected: `{"ok":true,"url":"https://checkout.stripe.com/…","sessionId":"cs_…"}`.

### C. Pay with a test card
Open the `url` from B. Stripe's test card: `4242 4242 4242 4242` · any future expiry · any CVC.

Submit. You'll redirect to your `returnUrl` with `?checkout=success&session_id=cs_…`.

### D. Verify the entitlement landed
In Supabase SQL editor:
```sql
select user_id, has_monthly, reading_credits, active_product_ids, last_synced_at, raw
from public.entitlement_snapshots
where raw->>'source' like 'stripe%'
order by last_synced_at desc limit 5;
```
You should see a row with `source: 'stripe-checkout.session.completed'` and either `reading_credits: 1` (single) or `has_monthly: true` (monthly).

### E. Verify in the app
- Refresh the app (`http://localhost:8090`)
- Settings → **Refresh Subscription Status**
- The dev panel's `Monthly` pill flips to `ACTIVE` (if monthly) or credits go up by 1 (if single)

## Subscription management (cancel, refund)

- **User cancels**: ship a `/account/manage` link to Stripe's [Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal). Not built in this pass — can be added later as a tiny route that creates a Stripe Billing Portal Session and redirects. Until then, users email support and you cancel from the Stripe dashboard.
- **You refund**: Stripe dashboard → Payments → find the payment → Refund. The `customer.subscription.deleted` webhook fires and the next snapshot writes `has_monthly: false`.

## Going live (test → live mode)

1. Stripe dashboard → toggle from **Test mode** to **Live mode** (top-right switch)
2. Repeat Step 1 (create products) and Step 2 (webhook) in live mode — they don't carry over
3. Update Railway env vars to live values: `STRIPE_SECRET_KEY` becomes `sk_live_…`, new `STRIPE_WEBHOOK_SECRET`, new `STRIPE_PRICE_*`
4. Update the client's `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` from `pk_test_…` to `pk_live_…`
5. Test with a real card (you can refund yourself afterward) before announcing

## Compliance reminders

- Stripe Checkout is hosted by Stripe → you're **out of scope for PCI DSS** as long as cards never touch your server
- For UK customers, Stripe handles VAT MOSS / OSS automatically if enabled
- **Do not advertise this as an iOS / Android in-app purchase**. This is a web checkout. If you later submit to the App Store, digital subscriptions sold inside the iOS app must use StoreKit — Apple will reject if you try to take Stripe payments from a sandboxed iOS context for digital content.
- Privacy: Stripe receives email + payment method. Listed in the app's privacy policy.
