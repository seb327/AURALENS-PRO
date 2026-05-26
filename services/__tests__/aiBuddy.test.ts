import { aiBuddyService, stripForbiddenKeys, CLIENT_DISCLAIMER } from '../aiBuddyService';
import { __setSupabaseForTests } from '../supabase';

// Shared edge-function modules. They're pure ESM and import each other with
// `.ts` extensions for Deno; Jest's resolver still finds them via
// `moduleFileExtensions` in the jest-expo preset.
import {
  detectCrisis,
  crisisResponseFor,
} from '../../supabase/functions/_shared/crisisGuardrail';
import {
  resolveProvider,
  parseBuddyJson,
  localFallback,
  shapeFinalResponse,
  buildUserPrompt,
  SYSTEM_PROMPT,
  DISCLAIMER,
} from '../../supabase/functions/_shared/aiProvider';
import {
  rejectIfForbiddenKeys,
} from '../../supabase/functions/_shared/buddyTypes';

afterEach(() => __setSupabaseForTests(null));

describe('crisisGuardrail', () => {
  it('triggers on self-harm phrasing', () => {
    expect(detectCrisis('i want to die today').triggered).toBe(true);
    expect(detectCrisis('thinking of suicide').triggered).toBe(true);
    expect(detectCrisis('i am going to kill myself').triggered).toBe(true);
  });

  it('does not trigger on benign messages', () => {
    expect(detectCrisis("i'm feeling tired but okay").triggered).toBe(false);
    expect(detectCrisis('my aura looks weird today').triggered).toBe(false);
  });

  it('produces a calm direct response with crisis resources', () => {
    const r = crisisResponseFor({ triggered: true, category: 'self-harm' });
    expect(r.toLowerCase()).toContain('emergency');
    expect(r.toLowerCase()).toContain('samaritans');
  });

  it('uses harm-others variant when category matches', () => {
    const r = crisisResponseFor({ triggered: true, category: 'harm-others' });
    expect(r.toLowerCase()).toContain('emergency services');
  });
});

describe('forbidden keys', () => {
  it('rejects raw image fields in the request body', () => {
    expect(rejectIfForbiddenKeys({ image: 'xxx', message: 'hi' })).toBe('image');
    expect(rejectIfForbiddenKeys({ photoBase64: 'AAA', message: 'hi' })).toBe('photoBase64');
    expect(rejectIfForbiddenKeys({ context: { faceLandmarks: [] } })).toBe('context.faceLandmarks');
  });

  it('passes a clean payload', () => {
    expect(rejectIfForbiddenKeys({ message: 'hi', context: { reading: { label: 'x' } } })).toBeNull();
  });

  it('client-side stripper removes forbidden keys before sending', () => {
    const cleaned = stripForbiddenKeys({
      reading: { label: 'x', image: 'should-be-gone' },
      pixels: [1, 2, 3],
      ok: true,
    } as any);
    expect((cleaned as any).pixels).toBeUndefined();
    expect((cleaned as any).reading.image).toBeUndefined();
    expect((cleaned as any).reading.label).toBe('x');
    expect((cleaned as any).ok).toBe(true);
  });
});

describe('provider selection', () => {
  it('selects Anthropic when AI_PROVIDER=anthropic and key present', () => {
    const r = resolveProvider({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' });
    expect(r.name).toBe('anthropic');
    expect(r.model).toContain('claude');
  });

  it('selects OpenAI when AI_PROVIDER=openai and key present', () => {
    const r = resolveProvider({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'k' });
    expect(r.name).toBe('openai');
  });

  it('falls back to Anthropic if its key is set but no preference', () => {
    const r = resolveProvider({ ANTHROPIC_API_KEY: 'k' });
    expect(r.name).toBe('anthropic');
  });

  it('uses local fallback when no key is configured', () => {
    const r = resolveProvider({});
    expect(r.name).toBe('fallback');
    expect(r.apiKey).toBeNull();
  });

  it('respects AI_MODEL override', () => {
    const r = resolveProvider({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'k', AI_MODEL: 'gpt-4.1' });
    expect(r.model).toBe('gpt-4.1');
  });
});

describe('prompt building', () => {
  it('includes reading context but never images or landmarks', () => {
    const p = buildUserPrompt(
      {
        reading: {
          readingId: 'r1', label: 'Clear Aura', score: 80, confidence: 75,
          dominantColour: 'Gold', element: 'Fire',
          zoneScores: { forehead: 70, brows: 65 },
          guidanceSummary: 'You are in a clear chapter',
        },
      },
      'hi buddy',
      [{ role: 'buddy', content: 'previous turn' }],
    );
    expect(p).toContain('Clear Aura');
    expect(p).toContain('Gold');
    expect(p).toContain('forehead: 70');
    expect(p).toContain('User message: hi buddy');
    expect(p.toLowerCase()).not.toContain('image');
    expect(p.toLowerCase()).not.toContain('base64');
    expect(p.toLowerCase()).not.toContain('pixels');
  });

  it('system prompt forbids medical, diagnostic, image, and protected-trait claims', () => {
    expect(SYSTEM_PROMPT).toMatch(/medical/i);
    expect(SYSTEM_PROMPT).toMatch(/protected traits/i);
    expect(SYSTEM_PROMPT).toMatch(/never analyse raw face images/i);
    expect(SYSTEM_PROMPT).toMatch(/scientifically proven/i);
  });
});

describe('parseBuddyJson', () => {
  it('parses a clean JSON reply', () => {
    const r = parseBuddyJson(JSON.stringify({
      reply: 'hello', suggestedPractices: ['breathe'], reflectionQuestion: 'what?', tone: 'calm',
    }));
    expect(r.reply).toBe('hello');
    expect(r.suggestedPractices).toEqual(['breathe']);
  });

  it('falls back gracefully on garbage', () => {
    const r = parseBuddyJson('not json at all');
    expect(r.reply.length).toBeGreaterThan(0);
    expect(r.suggestedPractices.length).toBeGreaterThan(0);
  });

  it('strips markdown fences if present', () => {
    const r = parseBuddyJson('```json\n{"reply":"x","suggestedPractices":[],"reflectionQuestion":"y","tone":"calm"}\n```');
    expect(r.reply).toBe('x');
  });
});

describe('shapeFinalResponse', () => {
  it('attaches the store-safe disclaimer and crisis flag', () => {
    const r = shapeFinalResponse(localFallback({}, 'hi'), false);
    expect(r.crisisDetected).toBe(false);
    expect(r.disclaimer).toBe(DISCLAIMER);
    expect(r.disclaimer.toLowerCase()).toContain('not medical');
  });
});

describe('aiBuddyService (client)', () => {
  it('returns a local fallback when Supabase is not configured', async () => {
    __setSupabaseForTests(null);
    const r = await aiBuddyService.send('how is my aura today?', {}, []);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('fallback');
      expect(r.response.disclaimer).toBe(CLIENT_DISCLAIMER);
    }
  });

  it('short-circuits to a crisis response on client-detected phrases', async () => {
    __setSupabaseForTests(null);
    const r = await aiBuddyService.send('i want to die', {}, []);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.response.crisisDetected).toBe(true);
      expect(r.response.reply.toLowerCase()).toContain('emergency');
    }
  });

  it('strips forbidden keys from outgoing context', async () => {
    let capturedBody: any = null;
    const sb: any = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
      functions: {
        invoke: async (_name: string, opts: any) => {
          capturedBody = opts?.body;
          return {
            data: {
              reply: 'ok',
              suggestedPractices: [],
              reflectionQuestion: 'why?',
              tone: 'calm',
              crisisDetected: false,
              disclaimer: 'd',
            },
            error: null,
          };
        },
      },
    };
    __setSupabaseForTests(sb);
    await aiBuddyService.send(
      'hi',
      {
        reading: { label: 'Clear Aura', dominantColour: 'Gold' },
        faceLandmarks: [{ x: 1 }],
        photoBase64: 'AAA',
      } as any,
      [],
    );
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.context.faceLandmarks).toBeUndefined();
    expect(capturedBody.context.photoBase64).toBeUndefined();
    expect(capturedBody.context.reading.label).toBe('Clear Aura');
  });

  it('forwards monthly-required errors from the edge function', async () => {
    const sb: any = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
      functions: {
        invoke: async () => ({
          data: { ok: false, error: 'Aura Buddy is part of AuraLens Monthly.', requiresMonthly: true },
          error: null,
        }),
      },
    };
    __setSupabaseForTests(sb);
    const r = await aiBuddyService.send('hi', {}, []);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.requiresMonthly).toBe(true);
      expect(r.message.toLowerCase()).toContain('monthly');
    }
  });

  it('forwards rate-limit errors', async () => {
    const sb: any = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
      functions: {
        invoke: async () => ({
          data: { ok: false, error: "You've reached today's Aura Buddy limit.", rateLimited: true },
          error: null,
        }),
      },
    };
    __setSupabaseForTests(sb);
    const r = await aiBuddyService.send('hi', {}, []);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.rateLimited).toBe(true);
    }
  });
});
