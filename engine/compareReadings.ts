// Pure comparison engine for two readings. Used by the compare screen.

import type { SavedReading } from '@/types/reading';
import type { MienShiangZoneKey } from '@/types/aura';

export interface ZoneDelta {
  zone: MienShiangZoneKey;
  before: number;
  after: number;
  delta: number;
}

export interface ReadingComparison {
  scoreDelta: number;
  labelChanged: boolean;
  dominantChanged: boolean;
  zones: ZoneDelta[];
  strongestImprovement?: ZoneDelta;
  largestDecline?: ZoneDelta;
  summary: string;
}

const ZONES: MienShiangZoneKey[] = ['forehead', 'brows', 'eyes', 'nose', 'cheeks', 'mouth', 'chinJaw'];

const ZONE_WORD: Record<MienShiangZoneKey, string> = {
  forehead: 'vision', brows: 'drive', eyes: 'presence',
  nose: 'willpower', cheeks: 'expression', mouth: 'communication', chinJaw: 'grounding',
};

export function compareReadings(before: SavedReading, after: SavedReading): ReadingComparison {
  const zones: ZoneDelta[] = ZONES.map((z) => ({
    zone: z,
    before: before.mienShiangZones[z].score,
    after: after.mienShiangZones[z].score,
    delta: after.mienShiangZones[z].score - before.mienShiangZones[z].score,
  }));

  const scoreDelta = after.auraResult.score - before.auraResult.score;
  const labelChanged = before.auraResult.label !== after.auraResult.label;
  const dominantChanged = before.auraResult.dominantColour !== after.auraResult.dominantColour;

  const positiveZones = zones.filter((z) => z.delta > 0);
  const negativeZones = zones.filter((z) => z.delta < 0);
  const strongestImprovement = positiveZones.length
    ? positiveZones.reduce((a, b) => (a.delta >= b.delta ? a : b))
    : undefined;
  const largestDecline = negativeZones.length
    ? negativeZones.reduce((a, b) => (a.delta <= b.delta ? a : b))
    : undefined;

  let summary: string;
  if (scoreDelta > 5) {
    summary = `Your aura score lifted by ${scoreDelta} points`;
    if (strongestImprovement) summary += `, led by your ${ZONE_WORD[strongestImprovement.zone]}.`;
    else summary += '.';
  } else if (scoreDelta < -5) {
    summary = `Your aura score dipped by ${Math.abs(scoreDelta)} points`;
    if (largestDecline) summary += `, mostly in ${ZONE_WORD[largestDecline.zone]}.`;
    else summary += '.';
  } else {
    summary = 'Your overall aura score is roughly steady';
    if (strongestImprovement && strongestImprovement.delta > 4) {
      summary += `, with ${ZONE_WORD[strongestImprovement.zone]} gaining clarity.`;
    } else if (largestDecline && largestDecline.delta < -4) {
      summary += `, with ${ZONE_WORD[largestDecline.zone]} asking for attention.`;
    } else {
      summary += '.';
    }
  }
  if (dominantChanged) {
    summary += ` Your dominant colour shifted from ${before.auraResult.dominantColour.toLowerCase()} to ${after.auraResult.dominantColour.toLowerCase()}.`;
  }

  return {
    scoreDelta,
    labelChanged,
    dominantChanged,
    zones,
    strongestImprovement,
    largestDecline,
    summary,
  };
}
