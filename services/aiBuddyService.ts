// Client-side Aura Buddy. Calls the Supabase edge function when available,
// otherwise produces a deterministic local fallback so the chat surface still
// works in Expo Go / dev / offline.
//
// We never send images, base64, or raw landmarks here — only the symbolic
// reading context already derived by the engine.

import { hashString, mulberry32 } from '@/engine/scoring';
import { getSupabase } from './supabase';
import type {
  AiBuddyRequest,
  AiBuddyResponse,
  BuddyContext,
  BuddyTurn,
} from '@/types/buddy';

// Forbidden keys we strip from any context object before sending. This is
// belt-and-braces — the edge function also rejects them.
const FORBIDDEN_KEYS = new Set([
  'image', 'images', 'photo', 'photos', 'imageBase64', 'photoBase64',
  'base64', 'imageData', 'photoData', 'pixels', 'landmarks', 'faceLandmarks',
]);

export function stripForbiddenKeys<T extends object>(obj: T): T {
  const out: any = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    if (v && typeof v === 'object') out[k] = stripForbiddenKeys(v as any);
    else out[k] = v;
  }
  return out;
}

export const CLIENT_DISCLAIMER =
  'This is a symbolic Mien Shiang-inspired aura reflection for spiritual wellbeing and self-awareness, not medical, psychological, or diagnostic advice.';

const CRISIS_HINTS = [
  /\bsuicid/i, /\bkill (?:myself|me)\b/i, /\bend (?:my|this) life\b/i,
  /\bself[-\s]?harm/i, /\bhurt(?:ing)? myself\b/i, /\bwant(?:ed)? to die\b/i,
];

function clientCrisis(message: string): boolean {
  return CRISIS_HINTS.some((re) => re.test(message));
}

function clientCrisisResponse(): AiBuddyResponse {
  return {
    reply:
      "I'm really sorry you're feeling this. This is bigger than an aura reading. " +
      'Please contact emergency services now if you are in immediate danger, ' +
      'or reach out to someone you trust and stay with them while you get support. ' +
      'In the UK call 116 123 (Samaritans). In the US dial or text 988.',
    suggestedPractices: [],
    reflectionQuestion: 'Is there a person you can be with right now?',
    tone: 'supportive',
    crisisDetected: true,
    disclaimer: CLIENT_DISCLAIMER,
  };
}

function localFallback(message: string, context: BuddyContext): AiBuddyResponse {
  const seed = hashString(`${context.reading?.readingId ?? ''}|${message}`);
  const rng = mulberry32(seed);
  const colour = context.reading?.dominantColour?.toLowerCase() ?? 'calm';
  const label = context.reading?.label?.toLowerCase() ?? 'reflective';
  const practices = [
    'Three slow breaths before you reply to anyone.',
    'Drink water. Lower your shoulders.',
    'Step outside for sixty seconds.',
    'Write one sentence about how you actually feel.',
  ];
  const reflections = [
    'What is one thing you can let go of today?',
    'Where in your day does your energy feel clearest?',
    'What is your body asking for right now?',
  ];
  return {
    reply:
      `Your reading is reading as ${label} with a ${colour} signature. ` +
      `I'm offline / running in local mode, so this is a gentle generic reflection. ` +
      `Symbolically the pattern suggests slowing down enough to notice what you actually need. ` +
      `Not medical or diagnostic — just a reflection.`,
    suggestedPractices: [
      practices[Math.floor(rng() * practices.length)]!,
      practices[Math.floor(rng() * practices.length)]!,
    ].filter((v, i, a) => a.indexOf(v) === i),
    reflectionQuestion: reflections[Math.floor(rng() * reflections.length)]!,
    tone: 'calm',
    crisisDetected: false,
    disclaimer: CLIENT_DISCLAIMER,
  };
}

export type BuddyResult =
  | { ok: true; response: AiBuddyResponse; source: 'remote' | 'fallback' }
  | { ok: false; message: string; rateLimited?: boolean; requiresMonthly?: boolean };

export const aiBuddyService = {
  async send(message: string, context: BuddyContext, history: BuddyTurn[]): Promise<BuddyResult> {
    if (clientCrisis(message)) {
      return { ok: true, response: clientCrisisResponse(), source: 'fallback' };
    }

    const safeContext = stripForbiddenKeys(context);
    const safeHistory = history.slice(-12).map((t) => ({
      role: t.role,
      content: stripForbiddenKeys({ c: t.content }).c,
    }));

    const sb = getSupabase();
    if (!sb) {
      return { ok: true, response: localFallback(message, safeContext), source: 'fallback' };
    }

    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData?.session) {
      return { ok: true, response: localFallback(message, safeContext), source: 'fallback' };
    }

    const payload: AiBuddyRequest = {
      message,
      readingId: safeContext.reading?.readingId,
      context: safeContext,
      history: safeHistory,
    };

    try {
      const { data, error } = await sb.functions.invoke<AiBuddyResponse | { ok: false; error: string; rateLimited?: boolean; requiresMonthly?: boolean }>(
        'ai-buddy',
        { body: payload },
      );
      if (error) {
        return { ok: true, response: localFallback(message, safeContext), source: 'fallback' };
      }
      // Functions client returns either the parsed JSON or the error envelope.
      if (data && (data as any).ok === false) {
        const env = data as { error: string; rateLimited?: boolean; requiresMonthly?: boolean };
        return { ok: false, message: env.error, rateLimited: env.rateLimited, requiresMonthly: env.requiresMonthly };
      }
      const r = data as AiBuddyResponse;
      if (!r?.reply) return { ok: true, response: localFallback(message, safeContext), source: 'fallback' };
      return { ok: true, response: r, source: 'remote' };
    } catch {
      return { ok: true, response: localFallback(message, safeContext), source: 'fallback' };
    }
  },
};
