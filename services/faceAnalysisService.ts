import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { hashString } from '@/engine/scoring';
import { scoreQuality, shouldRescanFromAnalysis } from '@/engine/faceQuality';
import type {
  FaceAnalysisResult,
  FaceAnalyzer,
  FaceAnalyzerKind,
} from '@/types/faceAnalysis';

// ─────────────────────────────────────────────────────────────────────────────
// Native analyzer (dev build only)
//
// Tries to lazy-load a real landmark detector at runtime. In Expo Go this will
// always fail (native modules are unavailable), so `isAvailable()` returns
// false and the registry picks the heuristic analyzer instead.
//
// To make this analyzer real, run a development build and add either:
//   • react-native-vision-camera + react-native-vision-camera-face-detector
//   • @react-native-ml-kit/face-detection
// then update `loadNativeDetector()` below to call into it.
// ─────────────────────────────────────────────────────────────────────────────

async function loadNativeDetector(): Promise<null | {
  detect: (uri: string) => Promise<{
    faces: Array<{
      bounds: { x: number; y: number; width: number; height: number };
      landmarks?: Record<string, { x: number; y: number }>;
      yaw?: number;
      pitch?: number;
      roll?: number;
      eyeOpenness?: { left: number; right: number };
      smilingProbability?: number;
    }>;
    imageWidth: number;
    imageHeight: number;
  }>;
}> {
  try {
    // The require is intentionally dynamic so Metro does not try to bundle this
    // module in Expo Go. Replace with the real detector module when wiring a
    // dev build (see comment above).
    // @ts-expect-error optional native dep, may not be installed
    const mod = await import('@react-native-ml-kit/face-detection').catch(() => null);
    if (!mod || typeof (mod as any).detect !== 'function') return null;

    return {
      detect: async (uri: string) => {
        const native = await (mod as any).detect(uri, {
          performanceMode: 'accurate',
          landmarkMode: 'all',
          contourMode: 'none',
          classificationMode: 'all',
        });
        return {
          faces: (native.faces ?? []).map((f: any) => ({
            bounds: f.frame ?? f.bounds ?? { x: 0, y: 0, width: 0, height: 0 },
            landmarks: f.landmarks ?? {},
            yaw: f.headEulerAngleY ?? f.yaw,
            pitch: f.headEulerAngleX ?? f.pitch,
            roll: f.headEulerAngleZ ?? f.roll,
            eyeOpenness: {
              left: f.leftEyeOpenProbability ?? 0.85,
              right: f.rightEyeOpenProbability ?? 0.85,
            },
            smilingProbability: f.smilingProbability ?? 0.2,
          })),
          imageWidth: native.imageWidth ?? 0,
          imageHeight: native.imageHeight ?? 0,
        };
      },
    };
  } catch {
    return null;
  }
}

const nativeFaceAnalyzer: FaceAnalyzer = {
  kind: 'native',
  async isAvailable() {
    return (await loadNativeDetector()) !== null;
  },
  async analyzeImage(uri) {
    const det = await loadNativeDetector();
    if (!det) {
      return makeUnsupportedResult('native', uri);
    }
    try {
      const { faces, imageWidth, imageHeight } = await det.detect(uri);
      const hash = await hashUri(uri);

      if (faces.length === 0) {
        const { quality, issues } = scoreQuality({
          facesDetected: 0,
          imageWidth,
          imageHeight,
        });
        const base: FaceAnalysisResult = {
          analyzer: 'native', sourceUri: uri, imageHash: hash,
          imageWidth, imageHeight, facesDetected: 0,
          quality, issues, rescan: true,
        };
        const r = shouldRescanFromAnalysis(base);
        return { ...base, rescan: r.rescan, rescanReason: r.reason };
      }

      const primary = faces[0]!;
      const bw = imageWidth || 1;
      const bh = imageHeight || 1;
      const bounds = {
        origin: { x: primary.bounds.x / bw, y: primary.bounds.y / bh },
        size: { width: primary.bounds.width / bw, height: primary.bounds.height / bh },
      };
      const landmarks = normalizeLandmarks(primary.landmarks ?? {}, bw, bh);
      const metrics = {
        symmetry: undefined,
        expressionTension: primary.smilingProbability !== undefined
          ? Math.round((1 - primary.smilingProbability) * 60)
          : 40,
        eyeOpenness: primary.eyeOpenness
          ? Math.round(((primary.eyeOpenness.left + primary.eyeOpenness.right) / 2) * 100)
          : undefined,
        mouthOpenness: undefined,
        headYaw: primary.yaw !== undefined ? clamp((primary.yaw ?? 0) / 45, -1, 1) : undefined,
        headPitch: primary.pitch !== undefined ? clamp((primary.pitch ?? 0) / 45, -1, 1) : undefined,
        headRoll: primary.roll !== undefined ? clamp((primary.roll ?? 0) / 45, -1, 1) : undefined,
      };

      const brightness = await estimateBrightness(uri);
      const detail = await estimateDetail(uri);

      const { quality, issues } = scoreQuality({
        facesDetected: faces.length,
        imageWidth, imageHeight,
        brightnessEstimate: brightness,
        detailEstimate: detail,
        faceBounds: {
          cx: bounds.origin.x + bounds.size.width / 2,
          cy: bounds.origin.y + bounds.size.height / 2,
          size: Math.max(bounds.size.width, bounds.size.height),
        },
        landmarks,
        metrics,
      });

      const base: FaceAnalysisResult = {
        analyzer: 'native',
        sourceUri: uri,
        imageHash: hash,
        imageWidth, imageHeight,
        facesDetected: faces.length,
        primaryFace: { bounds, landmarks, metrics },
        quality, issues,
        rescan: false,
      };
      const r = shouldRescanFromAnalysis(base);
      return { ...base, rescan: r.rescan, rescanReason: r.reason };
    } catch {
      return makeUnsupportedResult('native', uri, 'model-load-failed');
    }
  },
};

function normalizeLandmarks(raw: Record<string, { x: number; y: number }>, w: number, h: number) {
  const norm = (p?: { x: number; y: number }) =>
    p ? { x: p.x / w, y: p.y / h } : undefined;
  return {
    leftEye: norm(raw.leftEye ?? raw.LEFT_EYE),
    rightEye: norm(raw.rightEye ?? raw.RIGHT_EYE),
    leftEyebrow: norm(raw.leftEyebrowTop ?? raw.LEFT_EYEBROW_TOP),
    rightEyebrow: norm(raw.rightEyebrowTop ?? raw.RIGHT_EYEBROW_TOP),
    noseTip: norm(raw.noseBase ?? raw.NOSE_BASE),
    mouthCenter: norm(raw.mouthBottom ?? raw.MOUTH_BOTTOM),
    mouthLeft: norm(raw.mouthLeft ?? raw.MOUTH_LEFT),
    mouthRight: norm(raw.mouthRight ?? raw.MOUTH_RIGHT),
    leftCheek: norm(raw.leftCheek ?? raw.LEFT_CHEEK),
    rightCheek: norm(raw.rightCheek ?? raw.RIGHT_CHEEK),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic analyzer (Expo Go-safe)
//
// Cannot do real face detection without native modules. Instead it derives
// genuinely measurable, deterministic signals from the image:
//   • Brightness — estimated from JPEG re-encode size at very low quality
//   • Detail / sharpness — estimated from compressed file size at fixed dims
//   • Hash — deterministic per image content
//
// It returns facesDetected = -1 to signal "unknown", and assumes the user
// followed the on-screen framing guidance. Quality scoring and rescan prompts
// are still active.
// ─────────────────────────────────────────────────────────────────────────────

async function hashUri(uri: string): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const size = (info as any).size ?? 0;
    return hashString(`${uri}|${size}`).toString(16);
  } catch {
    return hashString(uri).toString(16);
  }
}

async function estimateBrightness(uri: string): Promise<number> {
  // Low-quality re-encode size correlates roughly with brightness/contrast spread.
  // Bright, contrasty images compress slightly worse at very low quality.
  // Returns a 0..1 value clamped into a sensible window.
  try {
    const r = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 32 } }],
      { compress: 0.1, format: ImageManipulator.SaveFormat.JPEG, base64: false },
    );
    const info = await FileSystem.getInfoAsync(r.uri);
    const size = (info as any).size ?? 1000;
    // Map ~150B..~2500B → 0.15..0.85
    const norm = (size - 150) / (2500 - 150);
    return clamp01(0.15 + norm * 0.7);
  } catch {
    return 0.55;
  }
}

async function estimateDetail(uri: string): Promise<number> {
  // At a fixed 128px resize, files with more edge detail compress larger.
  try {
    const r = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 128 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: false },
    );
    const info = await FileSystem.getInfoAsync(r.uri);
    const size = (info as any).size ?? 3000;
    // Map ~1500B..~15000B → 0.2..0.95
    const norm = (size - 1500) / (15000 - 1500);
    return clamp01(0.2 + norm * 0.75);
  } catch {
    return 0.55;
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function makeUnsupportedResult(
  analyzer: FaceAnalyzerKind,
  uri: string,
  issue: 'unsupported-device' | 'model-load-failed' = 'unsupported-device',
): FaceAnalysisResult {
  return {
    analyzer,
    sourceUri: uri,
    imageHash: hashString(uri).toString(16),
    imageWidth: 0,
    imageHeight: 0,
    facesDetected: -1,
    quality: { lighting: 50, sharpness: 50, faceCentered: 50, confidence: 30 },
    issues: [issue],
    rescan: false,
  };
}

const heuristicFaceAnalyzer: FaceAnalyzer = {
  kind: 'heuristic',
  async isAvailable() { return true; },
  async analyzeImage(uri) {
    let width = 0;
    let height = 0;
    try {
      const meta = await ImageManipulator.manipulateAsync(uri, [], { base64: false });
      width = meta.width;
      height = meta.height;
    } catch {
      return makeUnsupportedResult('heuristic', uri, 'unsupported-device');
    }

    const [brightness, detail, hash] = await Promise.all([
      estimateBrightness(uri),
      estimateDetail(uri),
      hashUri(uri),
    ]);

    // Without real face detection we assume the user framed within guidance.
    const assumedBounds = { cx: 0.5, cy: 0.5, size: 0.4 };

    const { quality, issues } = scoreQuality({
      facesDetected: -1,
      imageWidth: width,
      imageHeight: height,
      brightnessEstimate: brightness,
      detailEstimate: detail,
      faceBounds: assumedBounds,
    });

    const base: FaceAnalysisResult = {
      analyzer: 'heuristic',
      sourceUri: uri,
      imageHash: hash,
      imageWidth: width,
      imageHeight: height,
      facesDetected: -1,
      quality,
      issues,
      rescan: false,
    };
    const r = shouldRescanFromAnalysis(base);
    return { ...base, rescan: r.rescan, rescanReason: r.reason };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock analyzer (tests + fully-offline storybook-style flows)
// Deterministic per URI. Always returns a synthetic face.
// ─────────────────────────────────────────────────────────────────────────────

export function makeMockAnalyzer(opts?: {
  facesDetected?: number;
  quality?: { lighting: number; sharpness: number; faceCentered: number; confidence: number };
}): FaceAnalyzer {
  return {
    kind: 'mock',
    async isAvailable() { return true; },
    async analyzeImage(uri) {
      const hash = hashString(uri).toString(16);
      const facesDetected = opts?.facesDetected ?? 1;
      const quality = opts?.quality ?? { lighting: 75, sharpness: 70, faceCentered: 85, confidence: 78 };
      return {
        analyzer: 'mock',
        sourceUri: uri,
        imageHash: hash,
        imageWidth: 1080,
        imageHeight: 1440,
        facesDetected,
        primaryFace: facesDetected > 0 ? {
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
            symmetry: 82,
            expressionTension: 30,
            eyeOpenness: 80,
            mouthOpenness: 18,
            headYaw: 0.05,
            headPitch: 0.02,
            headRoll: 0.01,
          },
        } : undefined,
        quality,
        issues: facesDetected === 0 ? ['no-face'] : [],
        rescan: facesDetected === 0,
        rescanReason: facesDetected === 0 ? 'No face detected.' : undefined,
      };
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry — picks the best available analyzer at runtime.
// ─────────────────────────────────────────────────────────────────────────────

let chosen: FaceAnalyzer | null = null;

export async function getFaceAnalyzer(): Promise<FaceAnalyzer> {
  if (chosen) return chosen;
  if (await nativeFaceAnalyzer.isAvailable()) {
    chosen = nativeFaceAnalyzer;
  } else {
    chosen = heuristicFaceAnalyzer;
  }
  return chosen;
}

export function __resetAnalyzerForTests(a?: FaceAnalyzer): void {
  chosen = a ?? null;
}

export { nativeFaceAnalyzer, heuristicFaceAnalyzer };
