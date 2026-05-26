import type { AuraColourKey } from '@/constants/theme';

export type AuraLabel =
  | 'Clear Aura'
  | 'Rising Aura'
  | 'Mixed Aura'
  | 'Shielded Aura'
  | 'Clouded Aura'
  | 'Heavy Aura';

export type AuraElement = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export type MienShiangZoneKey =
  | 'forehead'
  | 'brows'
  | 'eyes'
  | 'nose'
  | 'cheeks'
  | 'mouth'
  | 'chinJaw';

export interface MienShiangZone {
  theme: string;
  score: number;
  interpretation: string;
}

export interface ImageQuality {
  lighting: number;
  sharpness: number;
  faceCentered: number;
  confidence: number;
}

export interface AuraEngineInput {
  inputType: 'camera' | 'upload';
  imageQuality: ImageQuality;
  landmarks?: unknown;
  imageHashes?: string[];
}

export interface AuraGuidance {
  summary: string;
  maintainGoodEnergy: string[];
  reduceHeavyEnergy: string[];
  dailyPractice: string;
  reflectionQuestion: string;
}

export interface AuraReading {
  readingId: string;
  timestamp: string;
  inputType: 'camera' | 'upload';
  imageQuality: ImageQuality;
  auraResult: {
    label: AuraLabel;
    score: number;
    dominantColour: AuraColourKey;
    secondaryColour: AuraColourKey;
    element: AuraElement;
    confidence: number;
  };
  mienShiangZones: Record<MienShiangZoneKey, MienShiangZone>;
  guidance: AuraGuidance;
  disclaimer: string;
}
