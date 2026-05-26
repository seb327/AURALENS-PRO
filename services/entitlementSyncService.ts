// Mirrors the local entitlement state into Supabase for account continuity.
// RevenueCat is and remains the source of truth for billing.

import { getSupabase } from './supabase';

export interface EntitlementSyncInput {
  userId: string;
  revenueCatCustomerId?: string;
  hasMonthly: boolean;
  readingCredits: number;
  activeProductIds: string[];
  raw?: Record<string, unknown>;
}

export const entitlementSyncService = {
  async sync(input: EntitlementSyncInput): Promise<{ ok: boolean; message?: string }> {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: 'Supabase not configured.' };

    // Update the user's profile.revenuecat_customer_id (idempotent).
    if (input.revenueCatCustomerId) {
      await sb
        .from('profiles')
        .upsert(
          { id: input.userId, revenuecat_customer_id: input.revenueCatCustomerId },
          { onConflict: 'id' },
        );
    }

    const { error } = await sb.from('entitlement_snapshots').insert({
      user_id: input.userId,
      revenuecat_customer_id: input.revenueCatCustomerId ?? null,
      has_monthly: input.hasMonthly,
      reading_credits: input.readingCredits,
      active_product_ids: input.activeProductIds,
      last_synced_at: new Date().toISOString(),
      raw: input.raw ?? {},
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  },

  async deleteAllForUser(userId: string): Promise<{ ok: boolean }> {
    const sb = getSupabase();
    if (!sb) return { ok: false };
    try { await sb.from('entitlement_snapshots').delete().eq('user_id', userId); } catch {}
    return { ok: true };
  },
};
