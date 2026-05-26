import { runAuraEngineFromAnalysis } from '../auraEngine';
import { mapLandmarksToZoneScores, poseBalance } from '../landmarkMapping';
import { scoreQuality, shouldRescanFromAnalysis } from '../faceQuality';
import { makeMockAnalyzer } from '@/services/faceAnalysisService';
import type { FaceAnalysisResult } from '@/types/faceAnalysis';

const goodAnalysis: FaceAnalysisResult = {
  analyzer: 'mock',
  sourceUri: 'mock://good',
  imageHash: 'deadbeef',
  imageWidth: 1080,
  imageHeight: 1440,
  facesDetected: 1,
  primaryFace: {
    bounds: { origin: { x: 0.25, y: 0.2 }, size: { width: 0.5, height: 0.6 } },
    landmarks: {
      leftEye: { x: 0.38, y: 0.42 },
      rightEye: { x: 0.62, y: 0.42 },
      leftEyebrow: { x: 0.38, y: 0.36 },
      rightEyebrow: { x: 0.62, y: 0.36 },
      noseTip: { x: 0.5, y: 0.55 },
      mouthCenter: { x: 0.5, y: 0.72 },
      mouthLeft: { x: 0.42, y: 0.72 },
      mouthRight: { x: 0.58, y: 0.72 },
      leftCheek: { x: 0.32, y: 0.6 },
      rightCheek: { x: 0.68, y: 0.6 },
      chin: { x: 0.5, y: 0.86 },
    },
    metrics: {
      expressionTension: 25, eyeOpenness: 82, mouthOpenness: 18,
      headYaw: 0.02, headPitch: 0.01, headRoll: 0.01,
    },
  },
  quality: { lighting: 78, sharpness: 75, faceCentered: 88, confidence: 80 },
  issues: [],
  rescan: false,
};

describe('landmark mapping', () => {
  it('symmetric face produces higher zone scores than asymmetric', () => {
    const sym = mapLandmarksToZoneScores(
      goodAnalysis.primaryFace!.landmarks,
      goodAnalysis.primaryFace!.metrics,
    );
    const asym = mapLandmarksToZoneScores(
      { ...goodAnalysis.primaryFace!.landmarks, leftEye: { x: 0.2, y: 0.55 } },
      goodAnalysis.primaryFace!.metrics,
    );
    expect(sym.eyes).toBeGreaterThan(asym.eyes);
  });

  it('penalises strong head pose', () => {
    expect(poseBalance({ headYaw: 0, headPitch: 0, headRoll: 0 })).toBe(100);
    expect(poseBalance({ headYaw: 0.8, headPitch: 0.5, headRoll: 0.3 })).toBeLessThan(20);
  });
});

describe('face quality', () => {
  it('flags low lighting and blur', () => {
    const { quality, issues } = scoreQuality({
      facesDetected: 1, imageWidth: 100, imageHeight: 100,
      brightnessEstimate: 0.05, detailEstimate: 0.1,
    });
    expect(quality.lighting).toBeLessThan(35);
    expect(quality.sharpness).toBeLessThan(35);
    expect(issues).toContain('low-light');
    expect(issues).toContain('blurry');
  });

  it('flags no face and caps confidence', () => {
    const { quality, issues } = scoreQuality({
      facesDetected: 0, imageWidth: 100, imageHeight: 100,
      brightnessEstimate: 0.55, detailEstimate: 0.7,
    });
    expect(issues).toContain('no-face');
    expect(quality.confidence).toBeLessThanOrEqual(25);
  });

  it('flags multiple faces', () => {
    const { issues } = scoreQuality({
      facesDetected: 2, imageWidth: 100, imageHeight: 100,
    });
    expect(issues).toContain('multiple-faces');
  });

  it('rescan reasons cover every issue', () => {
    const r = shouldRescanFromAnalysis({
      ...goodAnalysis,
      facesDetected: 0,
      primaryFace: undefined,
      issues: ['no-face'],
      quality: { lighting: 70, sharpness: 70, faceCentered: 50, confidence: 20 },
    });
    expect(r.rescan).toBe(true);
    expect(r.reason).toMatch(/no face/i);
  });
});

describe('auraEngine from analysis', () => {
  it('is deterministic for identical analysis', () => {
    const a = runAuraEngineFromAnalysis(goodAnalysis, 'camera');
    const b = runAuraEngineFromAnalysis(goodAnalysis, 'camera');
    expect(a.readingId).toBe(b.readingId);
    expect(a.auraResult.score).toBe(b.auraResult.score);
    expect(a.mienShiangZones.eyes.score).toBe(b.mienShiangZones.eyes.score);
  });

  it('produces lower score for low-confidence analysis', () => {
    const high = runAuraEngineFromAnalysis(goodAnalysis, 'camera');
    const low = runAuraEngineFromAnalysis({
      ...goodAnalysis,
      imageHash: 'feedface',
      quality: { lighting: 30, sharpness: 30, faceCentered: 30, confidence: 25 },
    }, 'camera');
    expect(low.auraResult.score).toBeLessThan(high.auraResult.score);
  });

  it('always includes a non-medical disclaimer', () => {
    const r = runAuraEngineFromAnalysis(goodAnalysis, 'camera');
    expect(r.disclaimer.toLowerCase()).toContain('not medical');
  });
});

describe('mock analyzer', () => {
  it('returns a face when requested', async () => {
    const a = makeMockAnalyzer({ facesDetected: 1 });
    const r = await a.analyzeImage('mock://x');
    expect(r.facesDetected).toBe(1);
    expect(r.primaryFace).toBeDefined();
  });

  it('returns no-face when configured', async () => {
    const a = makeMockAnalyzer({ facesDetected: 0 });
    const r = await a.analyzeImage('mock://nope');
    expect(r.facesDetected).toBe(0);
    expect(r.issues).toContain('no-face');
    expect(r.rescan).toBe(true);
  });
});
