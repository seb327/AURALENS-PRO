// Supabase Edge Function: reconcile-entitlements
//
// Placeholder for Phase 2.x — wires up a RevenueCat webhook receiver that
// keeps `public.entitlement_snapshots` and `public.profiles.revenuecat_customer_id`
// in sync without trusting the device. The device-side `entitlementSyncService`
// also writes snapshots, but those are advisory; this function is the trusted
// path.
//
// Deploy:
//   supabase functions deploy reconcile-entitlements --no-verify-jwt
//
// In RevenueCat dashboard → Project Settings → Integrations → Webhooks
//   URL:    https://<project>.functions.supabase.co/reconcile-entitlements
//   Header: Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>  (set in Supabase function env)
//
// TODO Phase 2.x:
//   1. Verify the `Authorization` header against REVENUECAT_WEBHOOK_AUTH.
//   2. Look up the user by `event.app_user_id` (set this from the device using sb.auth.uid()).
//   3. Map RevenueCat event types (INITIAL_PURCHASE / RENEWAL / CANCELLATION /
//      NON_RENEWING_PURCHASE / EXPIRATION) into entitlement_snapshots writes.
//   4. Idempotency: skip events whose `event.id` you have already seen.

// @ts-ignore — deno-only import resolved by Supabase Edge runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface RevenueCatEvent {
  event: {
    id?: string;
    type?: string;
    app_user_id?: string;
    product_id?: string;
    entitlement_ids?: string[];
    expiration_at_ms?: number;
  };
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // TODO: verify shared secret
  // const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  // if (req.headers.get('authorization') !== `Bearer ${expected}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const body: RevenueCatEvent = await req.json();
    // TODO: write to entitlement_snapshots using Service Role key.
    return new Response(JSON.stringify({ ok: true, received: body.event?.type ?? 'unknown' }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
});
