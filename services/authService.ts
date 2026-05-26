import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './supabase';

export interface AuthSession {
  user: { id: string; email: string | null };
  accessToken: string;
  expiresAt?: number;
}

export type AuthResult =
  | { ok: true; session?: AuthSession }
  | { ok: false; message: string };

function projectSession(session: Session | null): AuthSession | undefined {
  if (!session) return undefined;
  return {
    user: { id: session.user.id, email: session.user.email ?? null },
    accessToken: session.access_token,
    expiresAt: session.expires_at,
  };
}

function projectUser(user: User | null): AuthSession['user'] | null {
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

export const authService = {
  isConfigured(): boolean { return isSupabaseConfigured(); },

  async getSession(): Promise<AuthSession | undefined> {
    const sb = getSupabase();
    if (!sb) return undefined;
    const { data } = await sb.auth.getSession();
    return projectSession(data.session);
  },

  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: 'Cloud sync is not configured in this build.' };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: friendlyAuthError(error.message) };
    return { ok: true, session: projectSession(data.session) };
  },

  async signUpWithPassword(email: string, password: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: 'Cloud sync is not configured in this build.' };
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return { ok: false, message: friendlyAuthError(error.message) };
    return { ok: true, session: projectSession(data.session) };
  },

  async sendMagicLink(email: string, redirectTo?: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { ok: false, message: 'Cloud sync is not configured in this build.' };
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) return { ok: false, message: friendlyAuthError(error.message) };
    return { ok: true };
  },

  async signOut(): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  },

  onAuthStateChange(cb: (s: AuthSession | undefined) => void): () => void {
    const sb = getSupabase();
    if (!sb) return () => {};
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      cb(projectSession(session));
    });
    return () => data.subscription.unsubscribe();
  },

  projectUser,
};

function friendlyAuthError(raw: string): string {
  if (/invalid login/i.test(raw)) return 'That email and password do not match.';
  if (/already registered/i.test(raw)) return 'An account with this email already exists.';
  if (/email rate limit/i.test(raw)) return 'Too many emails sent. Try again in a few minutes.';
  if (/network/i.test(raw)) return 'Network error — check your connection.';
  return raw;
}
