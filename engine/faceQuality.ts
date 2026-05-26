import type {
  FaceAnalysisIssue,
  FaceAnalysisResult,
  FaceLandmarks,
  FaceMetrics,
  FaceQualityScores,
} from '@/types/faceAnalysis';
import { clamp } from './scoring';

export interface QualityInputs {
  facesDetected: number;
  imageWidth: number;
  imageHeight: number;
  // 0..1 estimate of overall brightness derived from the image
  brightnessEstimate?: number;
  // 0..1 estimate of detail / non-blurriness
  detailEstimate?: number;
  // 0..1 normalized face bounding box (if known)
  faceBounds?: { cx: number; cy: number; size: number };
  landmarks?: FaceLandmarks;
  metrics?: FaceMetrics;
}

// Convert raw 0..1 brightness into a score where mid-range light = best.
// Crushed shadows (<0.2) and blown highlights (>0.85) both hurt the score.
function brightnessToLighting(b: number): number {
  if (b <= 0) return 0;
  if (b >= 1) return 0;
  const ideal = 0.55;
  const dist = Math.abs(b - ideal);
  return Math.round(clamp(100 - dist * 180));
}

function detailToSharpness(d: number): number {
  return Math.round(clamp(d * 100));
}

function centeringScore(b?: { cx: number; cy: number; size: number }): number {
  if (!b) return 60; // unknown — assume moderate
  const dx = Math.abs(b.cx - 0.5);
  const dy = Math.abs(b.cy - 0.5);
  const offsetPenalty = Math.sqrt(dx * dx + dy * dy) * 200; // 0 at perfect centre
  const sizePenalty =
    b.size < 0.15 ? (0.15 - b.size) * 400 : // too far
    b.size > 0.75 ? (b.size - 0.75) * 200 : // too close
    0;
  return Math.round(clamp(100 - offsetPenalty - sizePenalty));
}

export function scoreQuality(i: QualityInputs): {
  quality: FaceQualityScores;
  issues: FaceAnalysisIssue[];
} {
  const issues: FaceAnalysisIssue[] = [];

  if (i.facesDetected === 0) issues.push('no-face');
  if (i.facesDetected > 1) issues.push('multiple-faces');

  const lighting = brightnessToLighting(i.brightnessEstimate ?? 0.5);
  const sharpness = detailToSharpness(i.detailEstimate ?? 0.5);
  const faceCentered = centeringScore(i.faceBounds);

  if (lighting < 35) issues.push('low-light');
  if (sharpness < 35) issues.push('blurry');
  if (i.faceBounds) {
    if (i.faceBounds.size < 0.15) issues.push('too-far');
    if (i.faceBounds.size > 0.75) issues.push('too-close');
  }
  if (i.metrics?.headYaw !== undefined && Math.abs(i.metrics.headYaw) > 0.45) {
    issues.push('side-angle');
  }

  // confidence is a blended view of all signals, plus a hard penalty if no face.
  let confidence = lighting * 0.3 + sharpness * 0.35 + faceCentered * 0.25;
  // 10% bonus when we actually detected a face
  if (i.facesDetected > 0) confidence += 10;
  // hard cap when serious issues exist
  if (issues.includes('no-face')) confidence = Math.min(confidence, 25);
  if (issues.includes('multiple-faces')) confidence = Math.min(confidence, 40);
  if (issues.includes('covered')) confidence = Math.min(confidence, 30);

  return {
    quality: {
      lighting,
      sharpness,
      faceCentered,
      confidence: Math.round(clamp(confidence)),
    },
    issues,
  };
}

export function shouldRescanFromAnalysis(r: FaceAnalysisResult): {
  rescan: boolean;
  reason?: string;
} {
  if (r.issues.includes('no-face')) {
    return { rescan: true, reason: 'No face detected — try a clearer, more centred shot.' };
  }
  if (r.issues.includes('multiple-faces')) {
    return { rescan: true, reason: 'More than one face was detected — please scan alone.' };
  }
  if (r.issues.includes('too-close')) {
    return { rescan: true, reason: 'Your face is too close to the camera — pull back a little.' };
  }
  if (r.issues.includes('too-far')) {
    return { rescan: true, reason: 'Your face is too far from the camera — come closer.' };
  }
  if (r.issues.includes('low-light')) {
    return { rescan: true, reason: 'Lighting is too dim — find a softer, brighter spot.' };
  }
  if (r.issues.includes('blurry')) {
    return { rescan: true, reason: 'The image is too blurry — hold steadier.' };
  }
  if (r.issues.includes('side-angle')) {
    return { rescan: true, reason: 'Please face the camera more directly.' };
  }
  if (r.issues.includes('covered')) {
    return { rescan: true, reason: 'Your face appears partially covered — remove anything blocking the frame.' };
  }
  if (r.quality.confidence < 35) {
    return { rescan: true, reason: 'Image quality is too low for a reliable reading.' };
  }
  return { rescan: false };
}
