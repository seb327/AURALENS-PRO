// Supabase Edge Function: ai-buddy
//
// Deploy:  supabase functions deploy ai-buddy
// Secrets: AI_PROVIDER, AI_MODEL, ANTHROPIC_API_KEY, OPENAI_API_KEY
//
// Pipeline (per request):
//   1. CORS preflight
//   2. Reject if request body contains forbidden image/biometric keys
//   3. Authenticate via Supabase JWT
//   4. Verify monthly entitlement from latest entitlement_snapshots row
//   5. Rate limit per user (last 24h)
//   6. Pre-call crisis guardrail — return crisis response without calling LLM
//   7. Call the provider (Anthropic / OpenAI / local fallback)
//   8. Post-call crisis guardrail — re-check the LLM reply
//   9. Persist user + assistant messages into ai_buddy_messages
//  10. Return structured AiBuddyResponse
//
// RevenueCat remains the billing source of truth. The entitlement check here
// is a snapshot read; clients can refresh the snapshot via the existing
// entitlementSyncService.

// @ts-ignore — deno-only import resolved by Supabase Edge runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { corsHeaders, handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { detectCrisis, crisisResponseFor } from '../_shared/crisisGuardrail.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import {
  resolveProvider,
  callProvider,
  shapeFinalResponse,
  DISCLAIMER,
  type ProviderEnv,
} from '../_shared/aiProvider.ts';
import {
  rejectIfForbiddenKeys,
  type AiBuddyRequest,
} from '../_shared/buddyTypes.ts';

// @ts-ignore — Deno global
declare const Deno: { env: { get(name: string): string | undefined } };

function getEnv(): ProviderEnv & {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
} {
  return {
    AI_PROVIDER: Deno.env.get('AI_PROVIDER'),
    AI_MODEL: Deno.env.get('AI_MODEL'),
    ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY'),
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  };
}

serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  const env = getEnv();

  // ── Parse + reject forbidden keys ──────────────────────────────────────
  let body: AiBuddyRequest;
  try {
    const raw = await req.json();
    const forbidden = rejectIfForbiddenKeys(raw);
    if (forbidden) {
      return jsonResponse(
        { ok: false, error: `Field "${forbidden}" is not allowed. Aura Buddy never receives images or raw biometric data.` },
        { status: 400 },
      );
    }
    body = raw as AiBuddyRequest;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.message || typeof body.message !== 'string') {
    return jsonResponse({ ok: false, error: 'Missing message' }, { status: 400 });
  }
  if (body.message.length > 4000) {
    return jsonResponse({ ok: false, error: 'Message too long' }, { status: 413 });
  }

  // ── Auth (server-side) ─────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return jsonResponse({ ok: false, error: 'Supabase env not configured' }, { status: 500 });
  }
  const userClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = userData.user.id;

  // Service-role client for trusted reads/writes.
  const adminClient = env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : userClient;

  // ── Entitlement check ──────────────────────────────────────────────────
  const { data: snap } = await adminClient
    .from('entitlement_snapshots')
    .select('has_monthly, last_synced_at')
    .eq('user_id', userId)
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snap || !snap.has_monthly) {
    return jsonResponse(
      {
        ok: false,
        error: 'Aura Buddy is part of AuraLens Monthly. Subscribe to unlock, or tap Restore Purchases.',
        requiresMonthly: true,
      },
      { status: 402 },
    );
  }

  // ── Rate limit ─────────────────────────────────────────────────────────
  const rl = await checkRateLimit(adminClient as any, userId);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, error: rl.message, rateLimited: true }, { status: 429 });
  }

  // ── Pre-call crisis guardrail ──────────────────────────────────────────
  const preCrisis = detectCrisis(body.message);
  if (preCrisis.triggered) {
    const reply = crisisResponseFor(preCrisis);
    await persistMessages(adminClient, userId, body.readingId, body.message, reply, true);
    return jsonResponse(shapeFinalResponse(
      { reply, suggestedPractices: [], reflectionQuestion: 'Is there a person you can be with right now?', tone: 'supportive' },
      true,
    ));
  }

  // ── Call LLM ───────────────────────────────────────────────────────────
  const provider = resolveProvider(env);
  let parsed;
  try {
    const result = await callProvider(provider, body.context ?? {}, body.history ?? [], body.message);
    parsed = result.parsed;
  } catch (e) {
    return jsonResponse({ ok: false, error: `Provider error: ${String(e)}` }, { status: 502 });
  }

  // ── Post-call crisis guardrail ─────────────────────────────────────────
  const postCrisis = detectCrisis(parsed.reply);
  if (postCrisis.triggered) {
    parsed = {
      reply: crisisResponseFor(postCrisis),
      suggestedPractices: [],
      reflectionQuestion: 'Is there a person you can be with right now?',
      tone: 'supportive',
    };
  }

  // ── Persist ────────────────────────────────────────────────────────────
  await persistMessages(adminClient, userId, body.readingId, body.message, parsed.reply, postCrisis.triggered);

  return jsonResponse(shapeFinalResponse(parsed, postCrisis.triggered));
});

async function persistMessages(
  sb: any,
  userId: string,
  readingId: string | undefined,
  userMessage: string,
  buddyMessage: string,
  crisis: boolean,
): Promise<void> {
  try {
    await sb.from('ai_buddy_messages').insert([
      { user_id: userId, reading_id: readingId ?? null, role: 'user', content: userMessage },
      { user_id: userId, reading_id: readingId ?? null, role: 'buddy', content: buddyMessage },
    ]);
    if (crisis) {
      // tag with a system row for analytics/audit
      await sb.from('ai_buddy_messages').insert({
        user_id: userId,
        reading_id: readingId ?? null,
        role: 'system',
        content: '[crisis_guardrail_triggered]',
      });
    }
  } catch {
    // best-effort persistence; the user already got their reply
  }
}

// Re-export the disclaimer for tests / introspection.
export { DISCLAIMER, corsHeaders };
