import type { ImageQuality } from '@/types/aura';
import { clamp } from './scoring';

export function computeConfidence(q: ImageQuality): number {
  // Weighted blend; sharpness and lighting matter most.
  const blended =
    q.lighting * 0.30 +
    q.sharpness * 0.35 +
    q.faceCentered * 0.20 +
    q.confidence * 0.15;
  return Math.round(clamp(blended));
}

export function shouldRescan(q: ImageQuality): { rescan: boolean; reason?: string } {
  if (q.lighting < 35) return { rescan: true, reason: 'Lighting is too dim — find a softer, brighter spot.' };
  if (q.sharpness < 35) return { rescan: true, reason: 'The image is too blurry — hold steadier.' };
  if (q.faceCentered < 35) return { rescan: true, reason: 'Centre your face inside the frame.' };
  return { rescan: false };
}
