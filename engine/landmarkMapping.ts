import type {
  FaceLandmarks,
  FaceMetrics,
  NormalizedPoint,
} from '@/types/faceAnalysis';
import type { MienShiangZoneKey } from '@/types/aura';
import { clamp } from './scoring';

// Maps detected face landmarks into deterministic 0..100 scores for each
// Mien Shiang zone. The scoring is structural and symbolic — never claims
// scientific accuracy, never infers protected traits, mental state, or health.

interface ZoneEvidence {
  // 0..1 evidence values pulled from landmark geometry. Each becomes part of
  // the symbolic score for that zone.
  presence: number;     // landmark exists at all
  symmetry: number;     // local symmetry where measurable
  openness: number;     // for eyes/mouth, how open the region is
  composure: number;    // inverse of detected tension in this area
}

function dist(a: NormalizedPoint, b: NormalizedPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function symmetryScore(a?: NormalizedPoint, b?: NormalizedPoint): number {
  if (!a || !b) return 0.5;
  // closer their y-coordinates and mirrored x-distance-from-center => more symmetric
  const yDelta = Math.abs(a.y - b.y);
  const centerX = (a.x + b.x) / 2;
  const xAsym = Math.abs(Math.abs(a.x - centerX) - Math.abs(b.x - centerX));
  return clamp(1 - yDelta * 6 - xAsym * 8, 0, 1);
}

function evidenceFor(
  zone: MienShiangZoneKey,
  l: FaceLandmarks,
  m: FaceMetrics,
): ZoneEvidence {
  const composureBase = m.expressionTension !== undefined
    ? clamp(1 - m.expressionTension / 100, 0, 1)
    : 0.65;

  switch (zone) {
    case 'forehead': {
      const presence = l.foreheadCenter ? 1 : 0.4;
      // forehead symmetry approximated via eyebrow line balance
      const sym = symmetryScore(l.leftEyebrow, l.rightEyebrow);
      return { presence, symmetry: sym, openness: 0.6, composure: composureBase };
    }
    case 'brows': {
      const presence = l.leftEyebrow && l.rightEyebrow ? 1 : 0.4;
      const sym = symmetryScore(l.leftEyebrow, l.rightEyebrow);
      // brow openness ≈ vertical distance from eyes
      let openness = 0.6;
      if (l.leftEye && l.leftEyebrow) {
        openness = clamp(Math.abs(l.leftEye.y - l.leftEyebrow.y) * 8, 0, 1);
      }
      return { presence, symmetry: sym, openness, composure: composureBase };
    }
    case 'eyes': {
      const presence = l.leftEye && l.rightEye ? 1 : 0.3;
      const sym = symmetryScore(l.leftEye, l.rightEye);
      const openness = m.eyeOpenness !== undefined ? clamp(m.eyeOpenness / 100, 0, 1) : 0.7;
      return { presence, symmetry: sym, openness, composure: composureBase };
    }
    case 'nose': {
      const presence = l.noseTip ? 1 : 0.5;
      // nose centred between eyes
      let sym = 0.6;
      if (l.noseTip && l.leftEye && l.rightEye) {
        const midX = (l.leftEye.x + l.rightEye.x) / 2;
        sym = clamp(1 - Math.abs(l.noseTip.x - midX) * 8, 0, 1);
      }
      return { presence, symmetry: sym, openness: 0.6, composure: composureBase };
    }
    case 'cheeks': {
      const presence = l.leftCheek && l.rightCheek ? 1 : 0.4;
      const sym = symmetryScore(l.leftCheek, l.rightCheek);
      return { presence, symmetry: sym, openness: 0.55, composure: composureBase };
    }
    case 'mouth': {
      const presence = l.mouthCenter || (l.mouthLeft && l.mouthRight) ? 1 : 0.3;
      const sym = symmetryScore(l.mouthLeft, l.mouthRight);
      const openness = m.mouthOpenness !== undefined ? clamp(m.mouthOpenness / 100, 0, 1) : 0.4;
      return { presence, symmetry: sym, openness, composure: composureBase };
    }
    case 'chinJaw': {
      const presence = l.chin ? 1 : 0.4;
      // chin centeredness vs nose
      let sym = 0.6;
      if (l.chin && l.noseTip) {
        sym = clamp(1 - Math.abs(l.chin.x - l.noseTip.x) * 6, 0, 1);
      }
      return { presence, symmetry: sym, openness: 0.55, composure: composureBase };
    }
  }
}

export function mapLandmarksToZoneScores(
  landmarks: FaceLandmarks,
  metrics: FaceMetrics,
): Record<MienShiangZoneKey, number> {
  const zones: MienShiangZoneKey[] = [
    'forehead', 'brows', 'eyes', 'nose', 'cheeks', 'mouth', 'chinJaw',
  ];
  const out = {} as Record<MienShiangZoneKey, number>;
  for (const z of zones) {
    const e = evidenceFor(z, landmarks, metrics);
    // Weighted blend: presence and symmetry dominate the structural score,
    // openness and composure modulate it.
    const blended =
      e.presence * 35 +
      e.symmetry * 30 +
      e.openness * 15 +
      e.composure * 20;
    out[z] = Math.round(clamp(blended));
  }
  return out;
}

export function poseBalance(m: FaceMetrics): number {
  // Returns 0..100. Penalises strong yaw/pitch/roll.
  const yaw = Math.abs(m.headYaw ?? 0);
  const pitch = Math.abs(m.headPitch ?? 0);
  const roll = Math.abs(m.headRoll ?? 0);
  return Math.round(clamp(100 - (yaw + pitch + roll) * 70));
}
