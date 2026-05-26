import type {
  AuraEngineInput,
  AuraElement,
  AuraLabel,
  AuraReading,
  MienShiangZone,
  MienShiangZoneKey,
} from '@/types/aura';
import type { FaceAnalysisResult } from '@/types/faceAnalysis';
import type { AuraColourKey } from '@/constants/theme';
import { DISCLAIMER_VERSION, copy } from '@/constants/copy';
import { clamp, jitter, mulberry32, pick, seedFromInputs } from './scoring';
import { computeConfidence } from './confidence';
import { ZONE_THEMES, interpretZone } from './mienShiangZones';
import { mapLandmarksToZoneScores, poseBalance } from './landmarkMapping';

const COLOURS: AuraColourKey[] = ['Gold', 'Violet', 'Blue', 'Green', 'Red', 'Indigo', 'White'];
const ELEMENTS: AuraElement[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

const ZONE_KEYS: MienShiangZoneKey[] = [
  'forehead', 'brows', 'eyes', 'nose', 'cheeks', 'mouth', 'chinJaw',
];

function labelFor(score: number): AuraLabel {
  if (score >= 78) return 'Clear Aura';
  if (score >= 62) return 'Rising Aura';
  if (score >= 48) return 'Mixed Aura';
  if (score >= 36) return 'Shielded Aura';
  if (score >= 22) return 'Clouded Aura';
  return 'Heavy Aura';
}

function uuidFromSeed(seed: number): string {
  const rng = mulberry32(seed);
  const hex = () => Math.floor(rng() * 0xffffffff).toString(16).padStart(8, '0');
  return `${hex().slice(0, 8)}-${hex().slice(0, 4)}-4${hex().slice(0, 3)}-a${hex().slice(0, 3)}-${hex()}${hex().slice(0, 4)}`;
}

function guidanceFor(
  label: AuraLabel,
  dominant: AuraColourKey,
  weakestZone: MienShiangZoneKey,
  strongestZone: MienShiangZoneKey,
): AuraReading['guidance'] {
  const zoneWord: Record<MienShiangZoneKey, string> = {
    forehead: 'vision', brows: 'drive', eyes: 'presence',
    nose: 'willpower', cheeks: 'expression', mouth: 'communication', chinJaw: 'grounding',
  };
  const summary = `Your aura is reading as ${label.toLowerCase()} with a ${dominant.toLowerCase()} signature. Your strongest zone is ${zoneWord[strongestZone]}. Your weakest zone is ${zoneWord[weakestZone]}.`;

  const maintainPool = [
    'Take five slow breaths before opening your phone in the morning.',
    'Drink water before caffeine.',
    'Step outside once today, even briefly.',
    'Keep one room or surface intentionally uncluttered.',
    'Speak one truthful sentence about how you actually feel.',
  ];
  const reducePool = [
    `Soften the ${zoneWord[weakestZone]} area: rest, hydrate, unclench.`,
    'Spend ten minutes off all screens before sleep.',
    'Move your body gently — walk, stretch, or shake out tension.',
    'Limit one source of input today (news, social, draining conversations).',
    'Write a single line of what you are willing to release.',
  ];

  return {
    summary,
    maintainGoodEnergy: maintainPool.slice(0, 3),
    reduceHeavyEnergy: reducePool.slice(0, 3),
    dailyPractice: `Three minutes of slow breathing while picturing a clear ${dominant.toLowerCase()} light around your ${zoneWord[weakestZone]} zone.`,
    reflectionQuestion: `Where in your life is your ${zoneWord[weakestZone]} being asked to grow?`,
  };
}

export function runAuraEngine(input: AuraEngineInput): AuraReading {
  const seedKey = [
    input.inputType,
    input.imageQuality.lighting.toFixed(2),
    input.imageQuality.sharpness.toFixed(2),
    input.imageQuality.faceCentered.toFixed(2),
    input.imageQuality.confidence.toFixed(2),
    ...(input.imageHashes ?? []),
  ];
  const seed = seedFromInputs(seedKey);
  const rng = mulberry32(seed);

  const confidence = computeConfidence(input.imageQuality);

  const baseScore = clamp(40 + (confidence - 50) * 0.6 + (rng() - 0.5) * 30);
  const score = Math.round(jitter(rng, baseScore, 8));
  const label = labelFor(score);

  const dominant = pick(rng, COLOURS);
  let secondary = pick(rng, COLOURS);
  if (secondary === dominant) {
    secondary = COLOURS[(COLOURS.indexOf(dominant) + 1) % COLOURS.length];
  }
  const element = pick(rng, ELEMENTS);

  const zones = {} as Record<MienShiangZoneKey, MienShiangZone>;
  let weakest: MienShiangZoneKey = 'forehead';
  let strongest: MienShiangZoneKey = 'forehead';
  let weakestScore = 101;
  let strongestScore = -1;

  for (const key of ZONE_KEYS) {
    const zoneScore = Math.round(clamp(jitter(rng, score, 22)));
    zones[key] = {
      theme: ZONE_THEMES[key],
      score: zoneScore,
      interpretation: interpretZone(key, zoneScore),
    };
    if (zoneScore < weakestScore) { weakestScore = zoneScore; weakest = key; }
    if (zoneScore > strongestScore) { strongestScore = zoneScore; strongest = key; }
  }

  return {
    readingId: uuidFromSeed(seed),
    timestamp: new Date().toISOString(),
    inputType: input.inputType,
    imageQuality: input.imageQuality,
    auraResult: {
      label,
      score,
      dominantColour: dominant,
      secondaryColour: secondary,
      element,
      confidence,
    },
    mienShiangZones: zones,
    guidance: guidanceFor(label, dominant, weakest, strongest),
    disclaimer: copy.disclaimers.long,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Landmark-aware reading
//
// When real landmarks are available (native dev build), zone scores are
// derived from facial structure rather than synthesised from the engine seed.
// Quality + image hash still feed the seeded RNG so every other field
// (colour, element, guidance variant) stays deterministic per input.
// ─────────────────────────────────────────────────────────────────────────────

export function runAuraEngineFromAnalysis(
  analysis: FaceAnalysisResult,
  inputType: 'camera' | 'upload',
): AuraReading {
  const seed = seedFromInputs([
    inputType,
    analysis.imageHash,
    analysis.quality.lighting,
    analysis.quality.sharpness,
    analysis.quality.faceCentered,
    analysis.quality.confidence,
    analysis.facesDetected,
  ]);
  const rng = mulberry32(seed);

  const dominant = pick(rng, COLOURS);
  let secondary = pick(rng, COLOURS);
  if (secondary === dominant) {
    secondary = COLOURS[(COLOURS.indexOf(dominant) + 1) % COLOURS.length];
  }
  const element = pick(rng, ELEMENTS);

  let zoneScores: Record<MienShiangZoneKey, number>;

  if (analysis.primaryFace) {
    zoneScores = mapLandmarksToZoneScores(
      analysis.primaryFace.landmarks,
      analysis.primaryFace.metrics,
    );
    // Damp scores by pose & overall confidence so a side-angle face cannot
    // claim a clear aura.
    const pose = poseBalance(analysis.primaryFace.metrics);
    const damp = (pose * 0.4 + analysis.quality.confidence * 0.6) / 100;
    for (const k of ZONE_KEYS) {
      zoneScores[k] = Math.round(clamp(zoneScores[k] * damp + (1 - damp) * 50));
    }
  } else {
    // Heuristic analyzer path — no landmarks, fall back to seed-driven scoring
    // anchored to confidence so we don't pretend to know more than we do.
    const baseScore = clamp(40 + (analysis.quality.confidence - 50) * 0.6 + (rng() - 0.5) * 30);
    const seeded = Math.round(jitter(rng, baseScore, 8));
    zoneScores = {} as Record<MienShiangZoneKey, number>;
    for (const k of ZONE_KEYS) {
      zoneScores[k] = Math.round(clamp(jitter(rng, seeded, 22)));
    }
  }

  // Overall aura score is the mean of zone scores, then nudged by confidence.
  const meanZone = Math.round(
    ZONE_KEYS.reduce((s, k) => s + zoneScores[k], 0) / ZONE_KEYS.length,
  );
  const score = Math.round(clamp(meanZone * 0.7 + analysis.quality.confidence * 0.3));
  const label = labelFor(score);

  const zones = {} as Record<MienShiangZoneKey, MienShiangZone>;
  let weakest: MienShiangZoneKey = 'forehead';
  let strongest: MienShiangZoneKey = 'forehead';
  let weakestScore = 101;
  let strongestScore = -1;
  for (const k of ZONE_KEYS) {
    const s = zoneScores[k];
    zones[k] = { theme: ZONE_THEMES[k], score: s, interpretation: interpretZone(k, s) };
    if (s < weakestScore) { weakestScore = s; weakest = k; }
    if (s > strongestScore) { strongestScore = s; strongest = k; }
  }

  return {
    readingId: uuidFromSeed(seed),
    timestamp: new Date().toISOString(),
    inputType,
    imageQuality: analysis.quality,
    auraResult: {
      label,
      score,
      dominantColour: dominant,
      secondaryColour: secondary,
      element,
      confidence: analysis.quality.confidence,
    },
    mienShiangZones: zones,
    guidance: guidanceFor(label, dominant, weakest, strongest),
    disclaimer: copy.disclaimers.long,
  };
}

export const __engineMeta = { disclaimerVersion: DISCLAIMER_VERSION };
