/**
 * Client-side VIP code redemption. Calls the Railway /redeem endpoint with
 * the signed-in Supabase user's JWT. The server validates the code and writes
 * an entitlement_snapshots row; the client just refreshes its store afterwards.
 */

import Constants from 'expo-constants';
import { getSupabase } from './supabase';

function getServerUrl(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { aiBuddyUrl?: string };
  const url = (extra.aiBuddyUrl || process.env.EXPO_PUBLIC_AI_BUDDY_URL || '').trim();
  return url.length > 0 ? url.replace(/\/+$/, '') : null;
}

export type RedeemResult =
  | { ok: true; grant: 'monthly' | 'single'; hasMonthly: boolean; readingCredits: number }
  | { ok: false; message: string; requiresSignIn?: boolean; serverNotConfigured?: boolean };

export const redeemService = {
  isConfigured(): boolean {
    return getServerUrl() !== null;
  },

  async redeem(code: string): Promise<RedeemResult> {
    const trimmed = code.trim();
    if (!trimmed) return { ok: false, message: 'Please enter a code.' };

    const serverUrl = getServerUrl();
    if (!serverUrl) {
      return { ok: false, message: 'Redemption is not available in this build.', serverNotConfigured: true };
    }

    const sb = getSupabase();
    if (!sb) {
      return { ok: false, message: 'Sign in to redeem a code.', requiresSignIn: true };
    }

    // Force-refresh the session so the access token we send is guaranteed
    // fresh. Without this, web users can be sitting on a session that
    // looks valid in localStorage but whose access_token expired hours ago,
    // which the server then rejects as "session expired".
    let token: string | undefined;
    try {
      const { data: refreshed } = await sb.auth.refreshSession();
      token = refreshed?.session?.access_token;
    } catch { /* fall through to getSession */ }
    if (!token) {
      const { data: sessionData } = await sb.auth.getSession();
      token = sessionData?.session?.access_token;
    }
    if (!token) {
      return { ok: false, message: 'Sign in to redeem a code.', requiresSignIn: true };
    }

    try {
      const res = await fetch(`${serverUrl}/redeem`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: trimmed }),
      });
      const body = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok || !(body as any).ok) {
        return { ok: false, message: (body as any)?.error ?? `Could not redeem (${res.status}).` };
      }
      return {
        ok: true,
        grant: (body as any).grant,
        hasMonthly: !!(body as any).has_monthly,
        readingCredits: Number((body as any).reading_credits ?? 0),
      };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'Network error reaching redemption server.' };
    }
  },
};
