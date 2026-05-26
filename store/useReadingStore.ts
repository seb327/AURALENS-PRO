import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS, loadJSON, removeKey, saveJSON } from '@/services/storage';
import type { AuraReading } from '@/types/aura';
import type { SavedReading } from '@/types/reading';
import { readingSyncService, type SyncContext, type SyncReport } from '@/services/readingSyncService';
import { useAuthStore, canCloudSync } from './useAuthStore';

interface ReadingState {
  readings: SavedReading[];
  current: AuraReading | null;
  hydrated: boolean;
  syncing: boolean;
  lastSync?: SyncReport;
  deviceId: string;

  hydrate: () => Promise<void>;
  setCurrent: (r: AuraReading | null) => void;
  save: (r: AuraReading, meta?: { yearTag?: number; note?: string }) => Promise<SyncReport | undefined>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  syncNow: () => Promise<SyncReport>;
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await loadJSON<string | null>('auralens.deviceId.v1', null);
  if (existing) return existing;
  const id = (Crypto.randomUUID?.() as string | undefined) ??
    `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await saveJSON('auralens.deviceId.v1', id);
  return id;
}

function syncCtx(deviceId: string): SyncContext {
  const auth = useAuthStore.getState();
  return {
    enabled: canCloudSync({
      isAuthenticated: auth.isAuthenticated,
      cloudSyncEnabled: auth.cloudSyncEnabled,
      isConfigured: auth.isConfigured,
    }),
    userId: auth.session?.user.id,
    deviceId,
  };
}

export const useReadingStore = create<ReadingState>((set, get) => ({
  readings: [],
  current: null,
  hydrated: false,
  syncing: false,
  deviceId: 'pending',

  async hydrate() {
    const [readings, deviceId] = await Promise.all([
      loadJSON<SavedReading[]>(STORAGE_KEYS.readings, []),
      getOrCreateDeviceId(),
    ]);
    set({ readings, deviceId, hydrated: true });
  },

  setCurrent(r) { set({ current: r }); },

  async save(r, meta) {
    const next: SavedReading = { ...r, ...meta };
    const all = [next, ...get().readings.filter((x) => x.readingId !== r.readingId)];
    await saveJSON(STORAGE_KEYS.readings, all);
    set({ readings: all });

    // Opportunistic push.
    const ctx = syncCtx(get().deviceId);
    if (ctx.enabled) {
      const report = await readingSyncService.pushOne(next, ctx);
      set({ lastSync: report });
      return report;
    }
    return undefined;
  },

  async remove(id) {
    const next = get().readings.filter((r) => r.readingId !== id);
    await saveJSON(STORAGE_KEYS.readings, next);
    set({ readings: next });
  },

  async clearAll() {
    await removeKey(STORAGE_KEYS.readings);
    set({ readings: [], current: null });
  },

  async syncNow() {
    const ctx = syncCtx(get().deviceId);
    if (!ctx.enabled) {
      const report: SyncReport = {
        status: 'skipped',
        pushed: 0, pulled: 0, skipped: 1,
        message: 'Cloud sync is off or not signed in.',
        at: new Date().toISOString(),
      };
      set({ lastSync: report });
      return report;
    }

    set({ syncing: true });
    try {
      const pushReport = await readingSyncService.pushMany(get().readings, ctx);
      const { report: pullReport, readings: remote } = await readingSyncService.pullAll(ctx);
      const merged = readingSyncService.merge(get().readings, remote);
      await saveJSON(STORAGE_KEYS.readings, merged);

      const combined: SyncReport = {
        status: pushReport.status === 'error' || pullReport.status === 'error'
          ? 'partial'
          : 'success',
        pushed: pushReport.pushed,
        pulled: pullReport.pulled,
        skipped: pushReport.skipped + pullReport.skipped,
        message: [pushReport.message, pullReport.message].filter(Boolean).join(' / ') || undefined,
        at: new Date().toISOString(),
      };
      set({ readings: merged, syncing: false, lastSync: combined });
      return combined;
    } catch (e: any) {
      const report: SyncReport = {
        status: 'error',
        pushed: 0, pulled: 0, skipped: 0,
        message: e?.message ?? 'Sync failed',
        at: new Date().toISOString(),
      };
      set({ syncing: false, lastSync: report });
      return report;
    }
  },
}));
