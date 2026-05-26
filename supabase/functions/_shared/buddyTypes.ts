// Shared types between the edge function and the client. Mirror these in
// `types/buddy.ts` on the React Native side.

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

// Sentinel keys the function rejects outright. Any of these in the request body
// is treated as a misuse attempt (raw image upload, base64 photos, etc).
export const FORBIDDEN_REQUEST_KEYS = [
  'image', 'images', 'photo', 'photos', 'imageBase64', 'photoBase64',
  'base64', 'imageData', 'photoData', 'pixels', 'landmarks', 'faceLandmarks',
] as const;

export function rejectIfForbiddenKeys(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  for (const key of FORBIDDEN_REQUEST_KEYS) {
    if (key in obj) return key;
  }
  // also scan one level into context for paranoia
  const ctx = obj.context as Record<string, unknown> | undefined;
  if (ctx && typeof ctx === 'object') {
    for (const key of FORBIDDEN_REQUEST_KEYS) {
      if (key in ctx) return `context.${key}`;
    }
  }
  return null;
}
