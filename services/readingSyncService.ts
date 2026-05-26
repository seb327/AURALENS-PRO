import type { AuraReading } from '@/types/aura';
import type { SavedReading } from '@/types/reading';
import { DISCLAIMER_VERSION } from '@/constants/copy';
import { getSupabase } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'partial' | 'error' | 'skipped';

export interface SyncReport {
  status: SyncStatus;
  pushed: number;
  pulled: number;
  skipped: number;
  message?: string;
  at: string;
}

interface RemoteReadingRow {
  id: string;
  user_id: string;
  local_id: string | null;
  created_at: string;
  updated_at: string;
  input_type: 'camera' | 'upload';
  aura_label: string;
  aura_score: number;
  dominant_colour: string;
  secondary_colour: string;
  element: string;
  confidence: number;
  zone_scores: AuraReading['mienShiangZones'];
  guidance: AuraReading['guidance'];
  image_quality: AuraReading['imageQuality'];
  disclaimer_version: string;
  source_device_id: string | null;
  deleted_at: string | null;
}

function toRow(r: SavedReading, userId: string, deviceId: string) {
  return {
    user_id: userId,
    local_id: r.readingId,
    created_at: r.timestamp,
    input_type: r.inputType,
    aura_label: r.auraResult.label,
    aura_score: r.auraResult.score,
    dominant_colour: r.auraResult.dominantColour,
    secondary_colour: r.auraResult.secondaryColour,
    element: r.auraResult.element,
    confidence: r.auraResult.confidence,
    zone_scores: r.mienShiangZones,
    guidance: r.guidance,
    image_quality: r.imageQuality,
    disclaimer_version: DISCLAIMER_VERSION,
    source_device_id: deviceId,
  };
}

function fromRow(row: RemoteReadingRow): SavedReading {
  return {
    readingId: row.local_id ?? row.id,
    timestamp: row.created_at,
    inputType: row.input_type,
    imageQuality: row.image_quality,
    auraResult: {
      label: row.aura_label as SavedReading['auraResult']['label'],
      score: row.aura_score,
      dominantColour: row.dominant_colour as SavedReading['auraResult']['dominantColour'],
      secondaryColour: row.secondary_colour as SavedReading['auraResult']['secondaryColour'],
      element: row.element as SavedReading['auraResult']['element'],
      confidence: row.confidence,
    },
    mienShiangZones: row.zone_scores,
    guidance: row.guidance,
    disclaimer: 'For reflection and spiritual wellbeing only. Not medical, psychological, or diagnostic advice.',
  };
}

export interface SyncContext {
  enabled: boolean;
  userId?: string;
  deviceId: string;
}

export const readingSyncService = {
  async pushOne(reading: SavedReading, ctx: SyncContext): Promise<SyncReport> {
    if (!ctx.enabled || !ctx.userId) return skipped('Sync disabled or not signed in.');
    const sb = getSupabase();
    if (!sb) return skipped('Supabase not configured.');

    const row = toRow(reading, ctx.userId, ctx.deviceId);
    const { error } = await sb
      .from('readings')
      .upsert(row, { onConflict: 'user_id,local_id' });
    if (error) return error_(error.message);
    return { status: 'success', pushed: 1, pulled: 0, skipped: 0, at: new Date().toISOString() };
  },

  async pushMany(readings: SavedReading[], ctx: SyncContext): Promise<SyncReport> {
    if (!ctx.enabled || !ctx.userId) return skipped('Sync disabled or not signed in.');
    const sb = getSupabase();
    if (!sb) return skipped('Supabase not configured.');
    if (readings.length === 0) return { status: 'success', pushed: 0, pulled: 0, skipped: 0, at: new Date().toISOString() };

    const rows = readings.map((r) => toRow(r, ctx.userId!, ctx.deviceId));
    const { error } = await sb
      .from('readings')
      .upsert(rows, { onConflict: 'user_id,local_id' });
    if (error) return error_(error.message);
    return { status: 'success', pushed: rows.length, pulled: 0, skipped: 0, at: new Date().toISOString() };
  },

  async pullAll(ctx: SyncContext): Promise<{ report: SyncReport; readings: SavedReading[] }> {
    if (!ctx.enabled || !ctx.userId) return { report: skipped('Sync disabled or not signed in.'), readings: [] };
    const sb = getSupabase();
    if (!sb) return { report: skipped('Supabase not configured.'), readings: [] };

    const { data, error } = await sb
      .from('readings')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) return { report: error_(error.message), readings: [] };
    const rows = (data ?? []) as RemoteReadingRow[];
    return {
      report: { status: 'success', pushed: 0, pulled: rows.length, skipped: 0, at: new Date().toISOString() },
      readings: rows.map(fromRow),
    };
  },

  // Merge local + remote. Local IDs win when both exist.
  merge(local: SavedReading[], remote: SavedReading[]): SavedReading[] {
    const byId = new Map<string, SavedReading>();
    for (const r of remote) byId.set(r.readingId, r);
    for (const r of local) byId.set(r.readingId, r); // local wins
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  },

  async softDeleteAll(ctx: SyncContext): Promise<SyncReport> {
    if (!ctx.enabled || !ctx.userId) return skipped('Sync disabled or not signed in.');
    const sb = getSupabase();
    if (!sb) return skipped('Supabase not configured.');
    const { error } = await sb
      .from('readings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', ctx.userId);
    if (error) return error_(error.message);
    return { status: 'success', pushed: 0, pulled: 0, skipped: 0, at: new Date().toISOString() };
  },
};

function skipped(message: string): SyncReport {
  return { status: 'skipped', pushed: 0, pulled: 0, skipped: 1, message, at: new Date().toISOString() };
}
function error_(message: string): SyncReport {
  return { status: 'error', pushed: 0, pulled: 0, skipped: 0, message, at: new Date().toISOString() };
}
