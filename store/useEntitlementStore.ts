import { create } from 'zustand';
import { STORAGE_KEYS, loadJSON, removeKey, saveJSON } from '@/services/storage';
import { purchaseService, type SyncedEntitlement } from '@/services/purchaseService';
import { entitlementSyncService } from '@/services/entitlementSyncService';
import { useAuthStore } from './useAuthStore';
import type { ProductId } from '@/constants/products';

export interface EntitlementState {
  isConfigured: boolean;
  isLoading: boolean;
  hasMonthly: boolean;
  readingCredits: number;
  customerId?: string;
  activeProductIds: string[];
  managementURL?: string;
  lastSyncedAt?: string;
  error?: string;

  // internal: transaction ids we've already converted into local credits
  consumedTransactionIds: string[];

  hydrated: boolean;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  purchase: (productId: ProductId) => Promise<{ ok: boolean; message?: string; cancelled?: boolean; pending?: boolean }>;
  restore: () => Promise<{ ok: boolean; recoveredMonthly: boolean }>;
  consumeOneCredit: () => Promise<boolean>;
  refundOneCredit: () => Promise<void>;
  reset: () => Promise<void>;
}

interface PersistedShape {
  readingCredits: number;
  hasMonthly: boolean;
  consumedTransactionIds: string[];
  customerId?: string;
  activeProductIds: string[];
  lastSyncedAt?: string;
}

const DEFAULT: PersistedShape = {
  readingCredits: 0,
  hasMonthly: false,
  consumedTransactionIds: [],
  activeProductIds: [],
};

async function persist(s: PersistedShape): Promise<void> {
  await saveJSON(STORAGE_KEYS.entitlement, s);
}

// Best-effort mirror to Supabase so the AI Buddy edge function can verify
// `has_monthly` server-side without trusting the device.
async function pushSnapshot(s: PersistedShape): Promise<void> {
  try {
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated || !auth.session?.user.id) return;
    await entitlementSyncService.sync({
      userId: auth.session.user.id,
      revenueCatCustomerId: s.customerId,
      hasMonthly: s.hasMonthly,
      readingCredits: s.readingCredits,
      activeProductIds: s.activeProductIds,
    });
  } catch {
    // mirror is advisory; failure does not affect local entitlement
  }
}

function applySynced(prev: PersistedShape, sync: SyncedEntitlement): PersistedShape {
  return {
    readingCredits: prev.readingCredits + sync.newReadingCredits,
    hasMonthly: sync.hasMonthly,
    consumedTransactionIds: Array.from(
      new Set([...prev.consumedTransactionIds, ...sync.newConsumedIds]),
    ),
    customerId: sync.customerId,
    activeProductIds: sync.activeProductIds,
    lastSyncedAt: new Date().toISOString(),
  };
}

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  isConfigured: false,
  isLoading: false,
  hasMonthly: false,
  readingCredits: 0,
  activeProductIds: [],
  consumedTransactionIds: [],
  hydrated: false,

  async hydrate() {
    set({ isLoading: true });
    const persisted = await loadJSON<PersistedShape>(STORAGE_KEYS.entitlement, DEFAULT);
    const isConfigured = await purchaseService.ensureConfigured();
    set({
      ...persisted,
      isConfigured,
      isLoading: false,
      hydrated: true,
    });
    // best-effort background sync
    if (isConfigured) {
      get().refresh().catch(() => {});
    }
  },

  async refresh() {
    set({ isLoading: true, error: undefined });
    try {
      const sync = await purchaseService.syncFromServer(get().consumedTransactionIds);
      const next = applySynced(
        {
          readingCredits: get().readingCredits,
          hasMonthly: get().hasMonthly,
          consumedTransactionIds: get().consumedTransactionIds,
          customerId: get().customerId,
          activeProductIds: get().activeProductIds,
          lastSyncedAt: get().lastSyncedAt,
        },
        sync,
      );
      await persist(next);
      set({ ...next, isLoading: false, managementURL: sync.managementURL });
      pushSnapshot(next);
    } catch (e: any) {
      set({ isLoading: false, error: e?.message ?? 'Sync failed' });
    }
  },

  async purchase(productId) {
    set({ isLoading: true, error: undefined });
    const res = await purchaseService.purchase(productId, get().consumedTransactionIds);
    if (res.kind === 'cancelled') {
      set({ isLoading: false });
      return { ok: false, cancelled: true };
    }
    if (res.kind === 'pending') {
      set({ isLoading: false });
      return { ok: false, pending: true, message: 'Your purchase is pending. We will unlock as soon as it clears.' };
    }
    if (res.kind === 'error') {
      set({ isLoading: false, error: res.message });
      return { ok: false, message: res.message };
    }

    const next = applySynced(
      {
        readingCredits: get().readingCredits,
        hasMonthly: get().hasMonthly,
        consumedTransactionIds: get().consumedTransactionIds,
        customerId: get().customerId,
        activeProductIds: get().activeProductIds,
        lastSyncedAt: get().lastSyncedAt,
      },
      res.entitlement,
    );
    await persist(next);
    set({ ...next, isLoading: false, managementURL: res.entitlement.managementURL });
    pushSnapshot(next);
    return { ok: true };
  },

  async restore() {
    set({ isLoading: true, error: undefined });
    try {
      const sync = await purchaseService.restore(get().consumedTransactionIds);
      const next = applySynced(
        {
          readingCredits: get().readingCredits,
          hasMonthly: get().hasMonthly,
          consumedTransactionIds: get().consumedTransactionIds,
          customerId: get().customerId,
          activeProductIds: get().activeProductIds,
          lastSyncedAt: get().lastSyncedAt,
        },
        sync,
      );
      await persist(next);
      set({ ...next, isLoading: false, managementURL: sync.managementURL });
      pushSnapshot(next);
      return { ok: true, recoveredMonthly: sync.hasMonthly };
    } catch (e: any) {
      set({ isLoading: false, error: e?.message ?? 'Restore failed' });
      return { ok: false, recoveredMonthly: false };
    }
  },

  async consumeOneCredit() {
    const s = get();
    if (s.hasMonthly) return true; // monthly never decrements
    if (s.readingCredits <= 0) return false;
    const next = s.readingCredits - 1;
    await persist({
      readingCredits: next,
      hasMonthly: s.hasMonthly,
      consumedTransactionIds: s.consumedTransactionIds,
      customerId: s.customerId,
      activeProductIds: s.activeProductIds,
      lastSyncedAt: s.lastSyncedAt,
    });
    set({ readingCredits: next });
    return true;
  },

  async refundOneCredit() {
    const s = get();
    if (s.hasMonthly) return;
    const next = s.readingCredits + 1;
    await persist({
      readingCredits: next,
      hasMonthly: s.hasMonthly,
      consumedTransactionIds: s.consumedTransactionIds,
      customerId: s.customerId,
      activeProductIds: s.activeProductIds,
      lastSyncedAt: s.lastSyncedAt,
    });
    set({ readingCredits: next });
  },

  async reset() {
    await removeKey(STORAGE_KEYS.entitlement);
    set({
      hasMonthly: false,
      readingCredits: 0,
      customerId: undefined,
      activeProductIds: [],
      consumedTransactionIds: [],
      lastSyncedAt: undefined,
      managementURL: undefined,
      error: undefined,
    });
  },
}));

export { canStartReading, canAccessMonthlyFeatures } from './entitlementRules';
