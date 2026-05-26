import { readingSyncService } from '../readingSyncService';
import { __setSupabaseForTests } from '../supabase';
import type { SavedReading } from '@/types/reading';

const mkReading = (id: string, ts = '2026-01-01T00:00:00.000Z'): SavedReading => ({
  readingId: id,
  timestamp: ts,
  inputType: 'camera',
  imageQuality: { lighting: 70, sharpness: 70, faceCentered: 70, confidence: 70 },
  auraResult: {
    label: 'Clear Aura',
    score: 80,
    dominantColour: 'Gold',
    secondaryColour: 'Blue',
    element: 'Fire',
    confidence: 80,
  },
  mienShiangZones: {
    forehead: { theme: 'x', score: 70, interpretation: '' },
    brows: { theme: 'x', score: 70, interpretation: '' },
    eyes: { theme: 'x', score: 70, interpretation: '' },
    nose: { theme: 'x', score: 70, interpretation: '' },
    cheeks: { theme: 'x', score: 70, interpretation: '' },
    mouth: { theme: 'x', score: 70, interpretation: '' },
    chinJaw: { theme: 'x', score: 70, interpretation: '' },
  },
  guidance: {
    summary: 's', maintainGoodEnergy: [], reduceHeavyEnergy: [],
    dailyPractice: 'd', reflectionQuestion: 'q',
  },
  disclaimer: 'Not medical, psychological, or diagnostic advice.',
});

function fakeSupabase() {
  const inserted: any[] = [];
  const sb: any = {
    from(_table: string) {
      return {
        upsert: async (rows: any) => {
          const arr = Array.isArray(rows) ? rows : [rows];
          inserted.push(...arr);
          return { error: null };
        },
        select: () => ({
          is: () => ({
            order: async () => ({ data: [], error: null }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    },
  };
  return { sb, inserted };
}

afterEach(() => __setSupabaseForTests(null));

describe('readingSyncService', () => {
  it('skips push when sync is disabled', async () => {
    const r = await readingSyncService.pushOne(mkReading('a'), {
      enabled: false, userId: 'u1', deviceId: 'd1',
    });
    expect(r.status).toBe('skipped');
  });

  it('skips push when user is not signed in', async () => {
    const { sb } = fakeSupabase();
    __setSupabaseForTests(sb);
    const r = await readingSyncService.pushOne(mkReading('a'), {
      enabled: true, userId: undefined, deviceId: 'd1',
    });
    expect(r.status).toBe('skipped');
  });

  it('skips when supabase is not configured', async () => {
    __setSupabaseForTests(null);
    const r = await readingSyncService.pushOne(mkReading('a'), {
      enabled: true, userId: 'u1', deviceId: 'd1',
    });
    expect(r.status).toBe('skipped');
  });

  it('pushes when sync is enabled and user is signed in', async () => {
    const { sb, inserted } = fakeSupabase();
    __setSupabaseForTests(sb);
    const r = await readingSyncService.pushOne(mkReading('abc'), {
      enabled: true, userId: 'u1', deviceId: 'd1',
    });
    expect(r.status).toBe('success');
    expect(r.pushed).toBe(1);
    expect(inserted[0].local_id).toBe('abc');
    expect(inserted[0].user_id).toBe('u1');
  });

  it('merges remote and local readings without duplicates, local wins', () => {
    const local = [mkReading('a', '2026-02-01T00:00:00Z')];
    const remote = [
      mkReading('a', '2026-01-01T00:00:00Z'), // older copy of same id
      mkReading('b', '2026-01-15T00:00:00Z'),
    ];
    const merged = readingSyncService.merge(local, remote);
    expect(merged).toHaveLength(2);
    const a = merged.find((r) => r.readingId === 'a')!;
    expect(a.timestamp).toBe('2026-02-01T00:00:00Z'); // local wins
    // newest first
    expect(merged[0].readingId).toBe('a');
  });
});

describe('cloud storage gating', () => {
  it('skips photo upload without consent', async () => {
    const { cloudStorageService } = require('../cloudStorageService');
    __setSupabaseForTests(null);
    const r = await cloudStorageService.uploadIfAllowed('file://x.jpg', {
      userId: 'u1',
      readingId: 'r1',
      cloudSyncEnabled: true,
      photoUploadConsent: false, // off
    });
    expect(r).toBeNull();
  });

  it('skips photo upload without cloud sync', async () => {
    const { cloudStorageService } = require('../cloudStorageService');
    const r = await cloudStorageService.uploadIfAllowed('file://x.jpg', {
      userId: 'u1',
      readingId: 'r1',
      cloudSyncEnabled: false,
      photoUploadConsent: true,
    });
    expect(r).toBeNull();
  });
});

describe('entitlement sync', () => {
  it('does not run when supabase is not configured', async () => {
    const { entitlementSyncService } = require('../entitlementSyncService');
    __setSupabaseForTests(null);
    const r = await entitlementSyncService.sync({
      userId: 'u1', hasMonthly: true, readingCredits: 3,
      activeProductIds: ['auralens_monthly_999'],
      revenueCatCustomerId: 'rc_123',
    });
    expect(r.ok).toBe(false);
  });

  it('writes a snapshot when supabase is configured', async () => {
    const { entitlementSyncService } = require('../entitlementSyncService');
    const inserted: any[] = [];
    const sb: any = {
      from(_t: string) {
        return {
          upsert: async () => ({ error: null }),
          insert: async (row: any) => { inserted.push(row); return { error: null }; },
        };
      },
    };
    __setSupabaseForTests(sb);
    const r = await entitlementSyncService.sync({
      userId: 'u1', hasMonthly: true, readingCredits: 3,
      activeProductIds: ['auralens_monthly_999'],
      revenueCatCustomerId: 'rc_123',
    });
    expect(r.ok).toBe(true);
    expect(inserted[0].user_id).toBe('u1');
    expect(inserted[0].has_monthly).toBe(true);
    expect(inserted[0].revenuecat_customer_id).toBe('rc_123');
  });
});
