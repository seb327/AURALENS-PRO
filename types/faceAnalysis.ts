// Public types for the face analysis layer. The same shape is returned by
// every analyzer (native dev-build, heuristic Expo Go fallback, mock for tests)
// so the engine and screens don't care which one ran.

export type FaceAnalyzerKind = 'native' | 'heuristic' | 'mock';

export interface NormalizedPoint {
  x: number; // 0..1, left → right of the source image
  y: number; // 0..1, top → bottom of the source image
}

export interface FaceBounds {
  origin: NormalizedPoint;
  size: { width: number; height: number }; // also 0..1 normalized
}

export interface FaceLandmarks {
  // All landmarks are normalized to 0..1 in the source image space.
  // Optional because not every analyzer can produce every point.
  leftEye?: NormalizedPoint;
  rightEye?: NormalizedPoint;
  leftEyebrow?: NormalizedPoint;
  rightEyebrow?: NormalizedPoint;
  noseTip?: NormalizedPoint;
  mouthCenter?: NormalizedPoint;
  mouthLeft?: NormalizedPoint;
  mouthRight?: NormalizedPoint;
  leftCheek?: NormalizedPoint;
  rightCheek?: NormalizedPoint;
  chin?: NormalizedPoint;
  foreheadCenter?: NormalizedPoint;
}

export interface FaceMetrics {
  // 0..100 scores. Each analyzer fills as many as it can; missing fields stay undefined.
  symmetry?: number;        // left/right facial symmetry
  expressionTension?: number; // higher = more tension
  eyeOpenness?: number;
  mouthOpenness?: number;
  headYaw?: number;         // -1..1 left/right turn
  headPitch?: number;       // -1..1 up/down
  headRoll?: number;        // -1..1 tilt
}

export interface FaceQualityScores {
  lighting: number;
  sharpness: number;
  faceCentered: number;
  confidence: number;
}

export type FaceAnalysisIssue =
  | 'no-face'
  | 'multiple-faces'
  | 'too-far'
  | 'too-close'
  | 'low-light'
  | 'blurry'
  | 'side-angle'
  | 'covered'
  | 'model-load-failed'
  | 'unsupported-device';

export interface FaceAnalysisResult {
  analyzer: FaceAnalyzerKind;
  sourceUri: string;
  imageHash: string;
  imageWidth: number;
  imageHeight: number;
  facesDetected: number; // -1 when the analyzer cannot detect faces at all
  primaryFace?: {
    bounds: FaceBounds;
    landmarks: FaceLandmarks;
    metrics: FaceMetrics;
  };
  quality: FaceQualityScores;
  issues: FaceAnalysisIssue[];
  rescan: boolean;
  rescanReason?: string;
}

export interface FaceAnalyzer {
  kind: FaceAnalyzerKind;
  isAvailable(): Promise<boolean>;
  analyzeImage(uri: string): Promise<FaceAnalysisResult>;
}
