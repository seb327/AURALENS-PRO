// Mirrors supabase/functions/_shared/buddyTypes.ts on the client.

import type { AuraReading } from './aura';

export interface BuddyReadingContext {
  readingId?: string;
  label?: string;
  score?: number;
  confidence?: number;
  dominantColour?: string;
  secondaryColour?: string;
  element?: string;
  zoneScores?: Record<string, number>;
  guidanceSummary?: string;
}

export interface BuddyContext {
  reading?: BuddyReadingContext;
  timelineSummary?: string;
}

export interface BuddyTurn {
  role: 'user' | 'buddy';
  content: string;
  id?: string;
  at?: string;
}

export interface AiBuddyRequest {
  message: string;
  readingId?: string;
  context: BuddyContext;
  history?: BuddyTurn[];
}

export interface AiBuddyResponse {
  reply: string;
  suggestedPractices: string[];
  reflectionQuestion: string;
  tone: 'calm' | 'grounded' | 'direct' | 'supportive';
  crisisDetected: boolean;
  disclaimer: string;
}

export function buildBuddyContextFromReading(r: AuraReading | undefined | null): BuddyContext {
  if (!r) return {};
  return {
    reading: {
      readingId: r.readingId,
      label: r.auraResult.label,
      score: r.auraResult.score,
      confidence: r.auraResult.confidence,
      dominantColour: r.auraResult.dominantColour,
      secondaryColour: r.auraResult.secondaryColour,
      element: r.auraResult.element,
      zoneScores: Object.fromEntries(
        Object.entries(r.mienShiangZones).map(([k, v]) => [k, v.score]),
      ),
      guidanceSummary: r.guidance.summary,
    },
  };
}
