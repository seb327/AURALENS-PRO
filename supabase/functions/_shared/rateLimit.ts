// Lightweight per-user, per-day rate limiter backed by ai_buddy_messages.
//
// Counts the user's own messages in the last `windowHours` window and rejects
// once the limit is reached. Avoids a separate table by reusing existing data;
// fine for Phase 2.4 traffic levels. Replace with Upstash / Redis later if
// volume grows.

export interface RateLimitConfig {
  maxMessages: number;
  windowHours: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxMessages: 40,
  windowHours: 24,
};

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  retryAfterMinutes?: number;
  message?: string;
}

interface SupabaseLike {
  from(table: string): {
    select: (...args: any[]) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => {
          gte: (col: string, val: string) => Promise<{ count: number | null; error: any }>;
        };
      };
    };
  };
}

export async function checkRateLimit(
  sb: SupabaseLike,
  userId: string,
  cfg: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - cfg.windowHours * 60 * 60 * 1000).toISOString();

  const { count, error } = await sb
    .from('ai_buddy_messages')
    .select('id', { count: 'exact', head: true } as any)
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', since);

  // If we can't check, fail open to avoid blocking legitimate users — but a
  // real implementation would route this to monitoring.
  if (error) return { allowed: true, used: 0, limit: cfg.maxMessages };

  const used = count ?? 0;
  if (used >= cfg.maxMessages) {
    return {
      allowed: false,
      used,
      limit: cfg.maxMessages,
      retryAfterMinutes: cfg.windowHours * 60,
      message: "You've reached today's Aura Buddy limit. Come back later or review your saved readings.",
    };
  }
  return { allowed: true, used, limit: cfg.maxMessages };
}
