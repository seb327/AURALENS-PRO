/**
 * AuraLens AI Aura Buddy — Railway-deployable HTTP server.
 *
 * Mirrors the Supabase Edge Function pipeline (verbatim semantics) but runs as
 * a long-lived Node process behind Railway. The shared modules under
 * supabase/functions/_shared/ are imported and bundled by esbuild so there is
 * no code duplication between the two deployment targets.
 *
 * Required env (Railway → Project → Variables):
 *   SUPABASE_URL                    – your project URL
 *   SUPABASE_ANON_KEY               – your project's anon key (server-side use)
 *   SUPABASE_SERVICE_ROLE_KEY       – optional but recommended; enables trusted reads/writes
 *   AI_PROVIDER                     – "anthropic" | "openai"
 *   AI_MODEL                        – e.g. "claude-3-5-sonnet-latest" | "gpt-4o-mini"
 *   ANTHROPIC_API_KEY               – if provider=anthropic
 *   OPENAI_API_KEY                  – if provider=openai
 *   PORT                            – injected by Railway
 *
 * Pipeline (per request):
 *   1. CORS preflight
 *   2. Reject if request body contains forbidden image/biometric keys
 *   3. Authenticate via Supabase JWT (Authorization: Bearer <user-jwt>)
 *   4. Verify monthly entitlement from latest entitlement_snapshots row
 *   5. Rate limit per user (last 24h)
 *   6. Pre-call crisis guardrail
 *   7. Call provider (Anthropic / OpenAI / local fallback)
 *   8. Post-call crisis guardrail
 *   9. Persist user + assistant messages into ai_buddy_messages
 *  10. Return structured AiBuddyResponse
 */

import express from 'express';
import type { Request, Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  handleCreateCheckout,
  handleStripeWebhook,
  stripeHealth,
} from './stripe.ts';

import { detectCrisis, crisisResponseFor } from '../../supabase/functions/_shared/crisisGuardrail.ts';
import { checkRateLimit } from '../../supabase/functions/_shared/rateLimit.ts';
import {
  resolveProvider,
  callProvider,
  shapeFinalResponse,
  type ProviderEnv,
} from '../../supabase/functions/_shared/aiProvider.ts';
import {
  rejectIfForbiddenKeys,
  type AiBuddyRequest,
} from '../../supabase/functions/_shared/buddyTypes.ts';

// ── CORS (Express-flavoured, same headers as edge function) ──────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function applyCors(res: Response): void {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

// ── Env reader (Node.js style) ───────────────────────────────────────────────

function getEnv(): ProviderEnv & {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
} {
  return {
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };
}

// ── Health endpoint ──────────────────────────────────────────────────────────

function envSummary(): { supabase: boolean; provider: string; stripe: ReturnType<typeof stripeHealth> } {
  const env = getEnv();
  const provider = resolveProvider(env).name;
  return {
    supabase: !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY,
    provider,
    stripe: stripeHealth(),
  };
}

// ── Pipeline ────────────────────────────────────────────────────────────────

async function handleAiBuddy(req: Request, res: Response): Promise<void> {
  applyCors(res);
  res.setHeader('content-type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  const env = getEnv();

  // 2. Reject forbidden keys
  const raw = req.body;
  if (!raw || typeof raw !== 'object') {
    res.status(400).json({ ok: false, error: 'Invalid JSON body' }); return;
  }
  const forbidden = rejectIfForbiddenKeys(raw);
  if (forbidden) {
    res.status(400).json({
      ok: false,
      error: `Field "${forbidden}" is not allowed. Aura Buddy never receives images or raw biometric data.`,
    });
    return;
  }

  const body = raw as AiBuddyRequest;
  if (!body?.message || typeof body.message !== 'string') {
    res.status(400).json({ ok: false, error: 'Missing message' }); return;
  }
  if (body.message.length > 4000) {
    res.status(413).json({ ok: false, error: 'Message too long' }); return;
  }

  // 3. Auth
  const authHeader = req.headers.authorization ?? '';
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    res.status(500).json({ ok: false, error: 'Supabase env not configured on server' }); return;
  }
  const userClient: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    res.status(401).json({ ok: false, error: 'Unauthorized' }); return;
  }
  const userId = userData.user.id;

  const adminClient: SupabaseClient = env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    : userClient;

  // 4. Entitlement check
  const { data: snap } = await adminClient
    .from('entitlement_snapshots')
    .select('has_monthly, last_synced_at')
    .eq('user_id', userId)
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snap || !snap.has_monthly) {
    res.status(402).json({
      ok: false,
      error: 'Aura Buddy is part of AuraLens Monthly. Subscribe to unlock, or tap Restore Purchases.',
      requiresMonthly: true,
    });
    return;
  }

  // 5. Rate limit
  const rl = await checkRateLimit(adminClient as any, userId);
  if (!rl.allowed) {
    res.status(429).json({ ok: false, error: rl.message, rateLimited: true }); return;
  }

  // 6. Pre-call crisis guardrail
  const preCrisis = detectCrisis(body.message);
  if (preCrisis.triggered) {
    const reply = crisisResponseFor(preCrisis);
    await persistMessages(adminClient, userId, body.readingId, body.message, reply, true);
    res.status(200).json(shapeFinalResponse(
      { reply, suggestedPractices: [], reflectionQuestion: 'Is there a person you can be with right now?', tone: 'supportive' },
      true,
    ));
    return;
  }

  // 7. LLM call
  const provider = resolveProvider(env);
  let parsed;
  try {
    const result = await callProvider(provider, body.context ?? {}, body.history ?? [], body.message);
    parsed = result.parsed;
  } catch (e) {
    res.status(502).json({ ok: false, error: `Provider error: ${String(e)}` }); return;
  }

  // 8. Post-call crisis guardrail
  const postCrisis = detectCrisis(parsed.reply);
  if (postCrisis.triggered) {
    parsed = {
      reply: crisisResponseFor(postCrisis),
      suggestedPractices: [],
      reflectionQuestion: 'Is there a person you can be with right now?',
      tone: 'supportive',
    };
  }

  // 9. Persist
  await persistMessages(adminClient, userId, body.readingId, body.message, parsed.reply, postCrisis.triggered);

  // 10. Return
  res.status(200).json(shapeFinalResponse(parsed, postCrisis.triggered));
}

async function persistMessages(
  sb: SupabaseClient,
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
      await sb.from('ai_buddy_messages').insert({
        user_id: userId,
        reading_id: readingId ?? null,
        role: 'system',
        content: '[crisis_guardrail_triggered]',
      });
    }
  } catch {
    // best-effort
  }
}

// ── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.disable('x-powered-by');

// Stripe webhook needs the RAW body to verify the signature — register that
// BEFORE the global JSON parser, otherwise Express re-encodes the bytes and
// the signature check fails. We also stash rawBody on the request so the
// handler can read it directly.
app.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json', limit: '1mb' }),
  (req, res) => {
    (req as any).rawBody = req.body as Buffer;
    return handleStripeWebhook(req as any, res);
  },
);

// Everything else uses JSON.
app.use(express.json({ limit: '64kb' })); // images/base64 never get this far

// Preflight on every route
app.options('*', (_req, res) => {
  applyCors(res);
  res.status(204).end();
});

// ── API routes ───────────────────────────────────────────────────────────────
// These MUST register before the static / SPA-fallback middleware so they
// take precedence over the catch-all.

app.get('/health', (_req, res) => {
  applyCors(res);
  res.json({ ok: true, ...envSummary() });
});

app.get('/api', (_req, res) => {
  applyCors(res);
  res.json({ service: 'auralens-server', ok: true });
});

// Aura Buddy
app.post('/ai-buddy', handleAiBuddy);

// Stripe checkout
app.post('/checkout/session', handleCreateCheckout);

// ── Web bundle (Expo export) ────────────────────────────────────────────────
// The Dockerfile's web-build stage drops the bundle at /app/web. In dev (tsx)
// the folder won't exist — that's fine, we degrade to a JSON ping at /.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.resolve(__dirname, '..', 'web');
const WEB_INDEX = path.join(WEB_DIR, 'index.html');
const hasWebBundle = fs.existsSync(WEB_INDEX);

if (hasWebBundle) {
  // Static assets (JS, CSS, images, fonts).
  app.use(express.static(WEB_DIR, { index: false, maxAge: '1h' }));

  // SPA fallback — any unmatched GET serves index.html so expo-router's
  // client-side routes work (e.g. /pricing, /auth, /buddy).
  app.get('*', (_req, res) => {
    applyCors(res);
    res.sendFile(WEB_INDEX);
  });
} else {
  // Dev-mode ping when there's no exported bundle.
  app.get('/', (_req, res) => {
    applyCors(res);
    res.json({ service: 'auralens-server', ok: true, mode: 'api-only' });
  });
  // Legacy compatibility — POST / used to hit Aura Buddy.
  app.post('/', handleAiBuddy);
}

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(
    `auralens-server listening on http://${HOST}:${PORT} ` +
      `(web bundle: ${hasWebBundle ? 'served' : 'not bundled'})`,
  );
});
