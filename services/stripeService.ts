/**
 * Client-side Stripe purchase service.
 *
 * The mobile/web client never holds the Stripe secret. It calls the Railway
 * server at `EXPO_PUBLIC_AI_BUDDY_URL` (same host as Aura Buddy — the server
 * serves both) to create a Stripe Checkout Session, then opens the returned
 * URL. After the user pays, Stripe redirects back to the app with
 * `?checkout=success&session_id=…` and a Stripe webhook posts the entitlement
 * to Supabase.
 *
 * No card data ever touches the device or the Railway server — Stripe-hosted
 * Checkout is PCI-out-of-scope by design.
 */

import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';
import { getSupabase } from './supabase';

export type StripeProduct = 'single' | 'monthly';

function getServerUrl(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { aiBuddyUrl?: string };
  const url = (extra.aiBuddyUrl || process.env.EXPO_PUBLIC_AI_BUDDY_URL || '').trim();
  return url.length > 0 ? url.replace(/\/+$/, '') : null;
}

function getReturnUrl(): string {
  // Web: redirect back to the same origin so the success page can show a
  // "Processing your purchase…" state.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/`;
  }
  // Native: a custom scheme is set in app.config.js (e.g. auralens://). Stripe
  // will redirect to this URL when the user taps Back to App.
  const scheme = (Constants.expoConfig?.scheme as string | undefined) ?? 'auralens';
  return `${scheme}://`;
}

export type StripeCheckoutResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; message: string; requiresSignIn?: boolean; serverNotConfigured?: boolean };

export const stripeService = {
  isConfigured(): boolean {
    return getServerUrl() !== null;
  },

  async createCheckout(product: StripeProduct): Promise<StripeCheckoutResult> {
    const serverUrl = getServerUrl();
    if (!serverUrl) {
      return { ok: false, message: 'Checkout server is not configured.', serverNotConfigured: true };
    }

    // Stripe attributes the checkout to the signed-in Supabase user via the
    // JWT. No anonymous purchases — that's by design (we need a user_id to
    // write entitlement_snapshots).
    const sb = getSupabase();
    if (!sb) {
      return { ok: false, message: 'Cloud sync is not configured. Sign in to purchase.', requiresSignIn: true };
    }

    // Force-refresh so the access token is guaranteed fresh — prevents
    // "session expired" 401s when a token has aged out in localStorage.
    let accessToken: string | undefined;
    try {
      const { data: refreshed } = await sb.auth.refreshSession();
      accessToken = refreshed?.session?.access_token;
    } catch { /* fall through */ }
    if (!accessToken) {
      const { data: sessionData } = await sb.auth.getSession();
      accessToken = sessionData?.session?.access_token;
    }
    if (!accessToken) {
      return { ok: false, message: 'Sign in to purchase. Your account holds your subscription.', requiresSignIn: true };
    }

    try {
      const res = await fetch(`${serverUrl}/checkout/session`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productId: product, returnUrl: getReturnUrl() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.url) {
        return { ok: false, message: body?.error ?? `Checkout failed (${res.status})` };
      }
      return { ok: true, url: body.url, sessionId: body.sessionId };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Network error reaching checkout server.' };
    }
  },

  /**
   * Open the Stripe Checkout URL. On web this navigates the current tab; on
   * native this opens the system browser (Stripe's hosted checkout cannot
   * embed inside a WebView without violating their TOS).
   */
  async openCheckoutUrl(url: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign(url);
      return;
    }
    await Linking.openURL(url);
  },
};
