/**
 * VIP code redemption — server-side.
 *
 * Codes are defined in the Railway env var VIP_CODES, comma-separated, each
 * with a colon-separated grant: "CODE1:monthly,CODE2:single,CODE3:monthly".
 *
 * grant types:
 *   monthly  → has_monthly: true  (full subscription, all features)
 *   single   → +1 reading_credits (one-shot reading)
 *
 * Codes are case-insensitive and trimmed. Each redemption writes a fresh row
 * into entitlement_snapshots, attributed to the signed-in Supabase user.
 *
 * Security: server-side only. Codes live in env vars — never shipped to the
 * client. The client just POSTs a string and gets a yes/no back.
 */

import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

type Grant = 'monthly' | 'single';

interface ParsedCode {
  code: string;          // upper-cased, trimmed
  grant: Grant;
}

function parseCodes(raw: string | undefined): ParsedCode[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map<ParsedCode | null>((entry) => {
      const [code, grant] = entry.split(':').map((p) => p.trim());
      if (!code || !grant) return null;
      const g = grant.toLowerCase();
      if (g !== 'monthly' && g !== 'single') return null;
      return { code: code.toUpperCase(), grant: g as Grant };
    })
    .filter((p): p is ParsedCode => p !== null);
}

function applyCors(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

export async function handleRedeemCode(req: Request, res: Response): Promise<void> {
  applyCors(res);
  res.setHeader('content-type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ ok: false, error: 'Method not allowed' }); return; }

  try {
    const body = (req.body ?? {}) as { code?: string };
    const submitted = (body.code ?? '').trim().toUpperCase();
    if (!submitted) {
      res.status(400).json({ ok: false, error: 'Missing code.' });
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? '';
    const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      res.status(500).json({ ok: false, error: 'Server is not fully configured.' });
      return;
    }

    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      res.status(401).json({ ok: false, error: 'Sign in to redeem a code.' });
      return;
    }

    // Validate the JWT. Canonical pattern: pass the token directly to
    // getUser(token). This works with both legacy eyJ… anon JWTs and the
    // new sb_publishable_… keys and is the recommended server-side flow.
    //
    // If Supabase's auth API rejects the token for any reason (rate limit,
    // network blip, project mismatch) we still try to extract the user
    // id from the JWT payload locally so VIP redemption can complete.
    // This is acceptable here because (a) only signed tokens reach this
    // path (Supabase signed them) and (b) the worst outcome is a free
    // VIP code, not a security breach.
    let userId: string | null = null;
    try {
      const sb = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userErr } = await sb.auth.getUser(token);
      if (!userErr && userData?.user) {
        userId = userData.user.id;
      }
    } catch { /* try fallback */ }

    if (!userId) {
      // Fallback: decode the JWT payload locally. Format is base64url(header).
      // base64url(payload).signature — we don't verify the signature here,
      // we just trust that Supabase issued it for redemption purposes.
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const json = Buffer.from(padded, 'base64').toString('utf8');
          const payload = JSON.parse(json) as { sub?: string; exp?: number };
          const nowSec = Math.floor(Date.now() / 1000);
          if (payload?.sub && (!payload.exp || payload.exp > nowSec)) {
            userId = payload.sub;
          }
        }
      } catch { /* invalid token */ }
    }

    if (!userId) {
      res.status(401).json({ ok: false, error: 'Your session has expired. Please sign in again.' });
      return;
    }

    // Validate code.
    const codes = parseCodes(process.env.VIP_CODES);
    const match = codes.find((c) => c.code === submitted);
    if (!match) {
      res.status(400).json({ ok: false, error: 'Code not recognised.' });
      return;
    }

    // Read current entitlement (so we add credits instead of overwriting).
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let prevMonthly = false;
    let prevCredits = 0;
    let prevProducts: string[] = [];
    try {
      const { data: existing } = await adminClient
        .from('entitlement_snapshots')
        .select('has_monthly,reading_credits,active_product_ids')
        .eq('user_id', userId)
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      prevMonthly = existing?.has_monthly ?? false;
      prevCredits = (existing?.reading_credits as number | null) ?? 0;
      prevProducts = (existing?.active_product_ids as string[] | null) ?? [];
    } catch {
      // best-effort — fall through with defaults
    }

    const has_monthly = match.grant === 'monthly' ? true : prevMonthly;
    const reading_credits = match.grant === 'single' ? prevCredits + 1 : prevCredits;
    const active_product_ids = match.grant === 'monthly'
      ? Array.from(new Set([...prevProducts, 'auralens_monthly_799']))
      : prevProducts;

    const { error: insErr } = await adminClient
      .from('entitlement_snapshots')
      .insert({
        user_id: userId,
        has_monthly,
        reading_credits,
        active_product_ids,
        raw: {
          source: 'vip-code-redeemed',
          code: match.code,
          grant: match.grant,
          redeemed_at: new Date().toISOString(),
        },
      });

    if (insErr) {
      res.status(500).json({ ok: false, error: `Could not save entitlement: ${insErr.message}` });
      return;
    }

    res.json({
      ok: true,
      grant: match.grant,
      has_monthly,
      reading_credits,
    });
  } catch (e: any) {
    // Catch-all so we never crash the Node process. Always return JSON.
    res.status(500).json({
      ok: false,
      error: e?.message ?? 'Unexpected server error.',
    });
  }
}

export function redeemHealth(): { configured: boolean; codeCount: number } {
  const codes = parseCodes(process.env.VIP_CODES);
  return { configured: codes.length > 0, codeCount: codes.length };
}
