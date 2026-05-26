// Provider abstraction for the AI Aura Buddy.
//
// Selects Anthropic or OpenAI based on `AI_PROVIDER` env. Falls back to a
// deterministic, store-safe local response when no provider is configured so
// the edge function never crashes during local dev.
//
// Pure ESM — no Deno or Supabase deps, so the selection logic is unit-testable
// with Jest from the React Native project.

import type { BuddyContext, BuddyTurn, AiBuddyResponse } from './buddyTypes.ts';

export type ProviderName = 'anthropic' | 'openai' | 'fallback';

export interface ProviderEnv {
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

export interface ResolvedProvider {
  name: ProviderName;
  model: string;
  apiKey: string | null;
}

export function resolveProvider(env: ProviderEnv): ResolvedProvider {
  const requested = (env.AI_PROVIDER ?? '').toLowerCase();
  if (requested === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return {
      name: 'anthropic',
      model: env.AI_MODEL || 'claude-3-5-sonnet-latest',
      apiKey: env.ANTHROPIC_API_KEY,
    };
  }
  if (requested === 'openai' && env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      model: env.AI_MODEL || 'gpt-4o-mini',
      apiKey: env.OPENAI_API_KEY,
    };
  }
  // Implicit fallthrough: prefer Anthropic if its key is set, else OpenAI.
  if (env.ANTHROPIC_API_KEY) {
    return { name: 'anthropic', model: env.AI_MODEL || 'claude-3-5-sonnet-latest', apiKey: env.ANTHROPIC_API_KEY };
  }
  if (env.OPENAI_API_KEY) {
    return { name: 'openai', model: env.AI_MODEL || 'gpt-4o-mini', apiKey: env.OPENAI_API_KEY };
  }
  return { name: 'fallback', model: 'local-fallback', apiKey: null };
}

export const SYSTEM_PROMPT = `You are Aura Buddy, a calm, grounded, spiritually aware wellbeing companion inside AuraLens.

You interpret symbolic Mien Shiang-inspired aura readings for reflection, self-awareness, journalling, and daily energy practices.

You must:
- Be warm, clear, and practical.
- Use the user's aura reading context if provided.
- Explain patterns without claiming certainty.
- Give one or two daily practices.
- Help the user maintain clearer energy and reduce heavy energy.
- Encourage reflection and consistency.
- Keep responses short — under 140 words. Mobile-friendly.
- Avoid fear, shame, manipulation, or supernatural certainty.
- Avoid medical, psychological, diagnostic, or crisis advice beyond directing users to real support.
- Never say the reading is scientifically proven.
- Never claim to know someone's soul, destiny, health, morality, or truth.
- Never classify protected traits.
- Never infer race, sexuality, religion, disability, criminality, or mental illness.
- Never analyse raw face images. You will never be sent images.

Always frame outputs as: "This is a symbolic Mien Shiang-inspired aura reflection for spiritual wellbeing and self-awareness, not medical, psychological, or diagnostic advice."

Respond as STRICT JSON with this exact shape:
{
  "reply": string,                 // your main response, under 140 words
  "suggestedPractices": string[],  // 1-3 short actionable practices
  "reflectionQuestion": string,    // a single gentle question
  "tone": "calm" | "grounded" | "direct" | "supportive"
}
Do not include any text outside the JSON.`;

export function buildUserPrompt(ctx: BuddyContext, message: string, history: BuddyTurn[]): string {
  const lines: string[] = [];
  if (ctx.reading) {
    const r = ctx.reading;
    lines.push('Current symbolic reading:');
    lines.push(`  Label: ${r.label}`);
    lines.push(`  Aura score: ${r.score}/100`);
    lines.push(`  Confidence: ${r.confidence}/100`);
    lines.push(`  Dominant colour: ${r.dominantColour}`);
    lines.push(`  Element: ${r.element}`);
    if (r.zoneScores) {
      lines.push('  Mien Shiang zones (0-100):');
      for (const [zone, score] of Object.entries(r.zoneScores)) {
        lines.push(`    ${zone}: ${score}`);
      }
    }
    if (r.guidanceSummary) lines.push(`  Engine guidance summary: ${r.guidanceSummary}`);
  } else {
    lines.push('No reading context available yet.');
  }
  if (ctx.timelineSummary) {
    lines.push('');
    lines.push(`Timeline context: ${ctx.timelineSummary}`);
  }
  if (history.length > 0) {
    lines.push('');
    lines.push('Recent conversation:');
    for (const t of history.slice(-6)) {
      lines.push(`  ${t.role}: ${t.content}`);
    }
  }
  lines.push('');
  lines.push(`User message: ${message}`);
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapters
// ─────────────────────────────────────────────────────────────────────────────

interface CallArgs {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
}

async function callAnthropic({ systemPrompt, userPrompt, model, apiKey }: CallArgs): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data?.content ?? []).map((b: any) => b?.text ?? '').join('').trim();
  return text;
}

async function callOpenAI({ systemPrompt, userPrompt, model, apiKey }: CallArgs): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return String(text).trim();
}

export interface CallProviderResult {
  provider: ProviderName;
  raw: string;
  parsed: ParsedBuddyJson;
}

export interface ParsedBuddyJson {
  reply: string;
  suggestedPractices: string[];
  reflectionQuestion: string;
  tone: 'calm' | 'grounded' | 'direct' | 'supportive';
}

export function parseBuddyJson(raw: string): ParsedBuddyJson {
  const fallback: ParsedBuddyJson = {
    reply: raw || 'Take three slow breaths. Notice one thing your body is asking for today.',
    suggestedPractices: ['Three slow breaths', 'A glass of water'],
    reflectionQuestion: 'What is one small thing you can release today?',
    tone: 'calm',
  };
  if (!raw) return fallback;
  try {
    // Try direct JSON parse first; some models wrap with prose.
    const trimmed = raw.trim().replace(/^```json\s*|```$/g, '').trim();
    const obj = JSON.parse(trimmed);
    return {
      reply: String(obj.reply ?? fallback.reply).slice(0, 1200),
      suggestedPractices: Array.isArray(obj.suggestedPractices)
        ? obj.suggestedPractices.slice(0, 3).map((s: unknown) => String(s).slice(0, 120))
        : fallback.suggestedPractices,
      reflectionQuestion: String(obj.reflectionQuestion ?? fallback.reflectionQuestion).slice(0, 240),
      tone: (['calm', 'grounded', 'direct', 'supportive'] as const).includes(obj.tone)
        ? obj.tone
        : 'calm',
    };
  } catch {
    return { ...fallback, reply: raw.slice(0, 1200) };
  }
}

export function localFallback(ctx: BuddyContext, message: string): ParsedBuddyJson {
  const colour = ctx.reading?.dominantColour ?? 'calm';
  const label = ctx.reading?.label ?? 'reflective';
  return {
    reply:
      `Your most recent reading came through as ${label.toLowerCase()} with a ${colour.toLowerCase()} signature. ` +
      `I am running in local fallback right now, so this response is generic — but the practice below still works. ` +
      `This is a symbolic Mien Shiang-inspired reflection for wellbeing, not medical, psychological, or diagnostic advice.`,
    suggestedPractices: [
      'Three slow breaths before reading your next message.',
      'Drink water and lower your shoulders.',
    ],
    reflectionQuestion: 'What in your day actually needs your attention right now?',
    tone: 'calm',
  };
}

export async function callProvider(
  provider: ResolvedProvider,
  ctx: BuddyContext,
  history: BuddyTurn[],
  message: string,
): Promise<CallProviderResult> {
  const userPrompt = buildUserPrompt(ctx, message, history);
  if (provider.name === 'fallback' || !provider.apiKey) {
    const parsed = localFallback(ctx, message);
    return { provider: 'fallback', raw: JSON.stringify(parsed), parsed };
  }
  const args: CallArgs = { systemPrompt: SYSTEM_PROMPT, userPrompt, model: provider.model, apiKey: provider.apiKey };
  const raw = provider.name === 'anthropic'
    ? await callAnthropic(args)
    : await callOpenAI(args);
  return { provider: provider.name, raw, parsed: parseBuddyJson(raw) };
}

export const DISCLAIMER =
  'This is a symbolic Mien Shiang-inspired aura reflection for spiritual wellbeing and self-awareness, not medical, psychological, or diagnostic advice.';

export function shapeFinalResponse(
  parsed: ParsedBuddyJson,
  crisisDetected: boolean,
): AiBuddyResponse {
  return {
    reply: parsed.reply,
    suggestedPractices: parsed.suggestedPractices,
    reflectionQuestion: parsed.reflectionQuestion,
    tone: parsed.tone,
    crisisDetected,
    disclaimer: DISCLAIMER,
  };
}
