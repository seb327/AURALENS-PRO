/**
 * Stripe purchase endpoints for AuraLens.
 *
 * Routes:
 *   POST /checkout/session
 *     body: { productId: 'single' | 'monthly', returnUrl: string }
 *     auth: Authorization: Bearer <Supabase user JWT>
 *     returns: { url, sessionId }
 *
 *   POST /webhook/stripe
 *     no auth (Stripe-signed)
 *     verifies signature with STRIPE_WEBHOOK_SECRET
 *     on `checkout.session.completed` and `invoice.paid` writes an
 *     entitlement_snapshots row keyed on `client_reference_id` (the user's
 *     Supabase auth.users.id, passed at session creation).
 *
 * Required Railway env:
 *   STRIPE_SECRET_KEY            sk_test_… (test) or sk_live_… (production)
 *   STRIPE_WEBHOOK_SECRET        whsec_… from the dashboard webhook page
 *   STRIPE_PRICE_SINGLE          price_… for £1.99 instant reading
 *   STRIPE_PRICE_MONTHLY         price_… for £7.99/month subscription
 *   SUPABASE_URL                 already required for ai-buddy
 *   SUPABASE_ANON_KEY            same
 *   SUPABASE_SERVICE_ROLE_KEY    same — used to write entitlement_snapshots
 */

import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface StripeEnv {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_SINGLE: string;
  STRIPE_PRICE_MONTHLY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function env(): StripeEnv {
  return {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    STRIPE_PRICE_SINGLE: process.env.STRIPE_PRICE_SINGLE ?? '',
    STRIPE_PRICE_MONTHLY: process.env.STRIPE_PRICE_MONTHLY ?? '',
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };
}

function stripeClient(): Stripe | null {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' as any });
}

function adminSupabase(): SupabaseClient | null {
  const e = env();
  if (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function applyCors(res: Response): void {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

/**
 * POST /checkout/session
 * Creates a Stripe Checkout Session for the requested product and returns
 * the Stripe-hosted URL the client should open.
 */
export async function handleCreateCheckout(req: Request, res: Response): Promise<void> {
  applyCors(res);
  res.setHeader('content-type', 'application/json');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const e = env();
  const stripe = stripeClient();
  if (!stripe) { res.status(500).json({ ok: false, error: 'Stripe not configured on server' }); return; }

  // Auth: verify the caller's Supabase JWT and pull user.id
  const authHeader = (req.headers.authorization ?? '').toString();
  if (!e.SUPABASE_URL || !e.SUPABASE_ANON_KEY) {
    res.status(500).json({ ok: false, error: 'Supabase not configured on server' });
    return;
  }
  const userClient = createClient(e.SUPABASE_URL, e.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) { res.status(401).json({ ok: false, error: 'Unauthorized' }); return; }
  const user = userData.user;

  const body = req.body as { productId?: string; returnUrl?: string };
  const productId = body.productId;
  const returnUrl = body.returnUrl;
  if (productId !== 'single' && productId !== 'monthly') {
    res.status(400).json({ ok: false, error: 'productId must be "single" or "monthly"' });
    return;
  }
  if (!returnUrl || !/^https?:\/\//.test(returnUrl)) {
    res.status(400).json({ ok: false, error: 'returnUrl must be a valid http(s) URL' });
    return;
  }

  const priceId = productId === 'single' ? e.STRIPE_PRICE_SINGLE : e.STRIPE_PRICE_MONTHLY;
  if (!priceId) {
    res.status(500).json({ ok: false, error: `Stripe price for "${productId}" not configured` });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: productId === 'monthly' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      // Used by the webhook to know which AuraLens user to credit.
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: { productId, supabaseUserId: user.id },
      // Success page receives ?session_id=… so the client can show a
      // "processing your purchase…" state while the webhook lands.
      success_url: `${returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    res.status(200).json({ ok: true, url: session.url, sessionId: session.id });
  } catch (err: any) {
    res.status(502).json({ ok: false, error: `Stripe error: ${err?.message ?? String(err)}` });
  }
}

/**
 * POST /webhook/stripe
 * Verifies Stripe signature, then writes an entitlement_snapshots row when a
 * subscription becomes active or a one-off payment completes.
 */
export async function handleStripeWebhook(req: Request & { rawBody?: Buffer }, res: Response): Promise<void> {
  const e = env();
  const stripe = stripeClient();
  if (!stripe || !e.STRIPE_WEBHOOK_SECRET) {
    res.status(500).send('Stripe not configured');
    return;
  }

  const sig = req.headers['stripe-signature'];
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!sig || !rawBody) {
    res.status(400).send('Missing signature or raw body');
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig.toString(), e.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    res.status(400).send(`Webhook signature verification failed: ${err?.message ?? String(err)}`);
    return;
  }

  const sb = adminSupabase();
  if (!sb) { res.status(500).send('Supabase not configured'); return; }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? null;
        const productId = (session.metadata?.productId ?? '').toString();
        if (!userId) break;

        const isMonthly = productId === 'monthly' || session.mode === 'subscription';
        const isSingle = productId === 'single' || session.mode === 'payment';

        // Insert a fresh snapshot row (read order = newest-first elsewhere).
        await sb.from('entitlement_snapshots').insert({
          user_id: userId,
          has_monthly: isMonthly,
          reading_credits: isSingle ? 1 : 0,
          active_product_ids: isMonthly ? ['auralens_monthly_799'] : ['auralens_instant_reading_199'],
          revenuecat_customer_id: null,
          raw: { source: 'stripe-checkout.session.completed', sessionId: session.id, mode: session.mode },
        });
        break;
      }

      case 'invoice.paid': {
        // Subscription renewal — keep monthly active.
        const invoice = event.data.object as Stripe.Invoice;
        const userId = (invoice.metadata?.supabaseUserId
          ?? invoice.subscription_details?.metadata?.supabaseUserId
          ?? null);
        if (!userId) break;
        await sb.from('entitlement_snapshots').insert({
          user_id: userId,
          has_monthly: true,
          reading_credits: 0,
          active_product_ids: ['auralens_monthly_799'],
          revenuecat_customer_id: null,
          raw: { source: 'stripe-invoice.paid', invoiceId: invoice.id },
        });
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata?.supabaseUserId ?? null);
        if (!userId) break;
        const stillActive = sub.status === 'active' || sub.status === 'trialing';
        await sb.from('entitlement_snapshots').insert({
          user_id: userId,
          has_monthly: stillActive,
          reading_credits: 0,
          active_product_ids: stillActive ? ['auralens_monthly_799'] : [],
          revenuecat_customer_id: null,
          raw: { source: `stripe-${event.type}`, subscriptionId: sub.id, status: sub.status },
        });
        break;
      }

      default:
        // Ignore the rest — Stripe sends many.
        break;
    }
    res.status(200).json({ received: true });
  } catch (err: any) {
    // 500 makes Stripe retry — that's what we want for transient DB errors.
    res.status(500).send(`Handler error: ${err?.message ?? String(err)}`);
  }
}

export function stripeHealth(): { stripe: boolean; webhook: boolean; prices: boolean } {
  const e = env();
  return {
    stripe: !!e.STRIPE_SECRET_KEY,
    webhook: !!e.STRIPE_WEBHOOK_SECRET,
    prices: !!e.STRIPE_PRICE_SINGLE && !!e.STRIPE_PRICE_MONTHLY,
  };
}
