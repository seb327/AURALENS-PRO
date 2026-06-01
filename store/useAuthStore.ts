import { create } from 'zustand';
import { STORAGE_KEYS, loadJSON, saveJSON } from '@/services/storage';
import { authService, type AuthSession, type OAuthProvider } from '@/services/authService';

export interface AuthPrefs {
  cloudSyncEnabled: boolean;
  photoUploadConsent: boolean;
}

interface AuthState extends AuthPrefs {
  isConfigured: boolean;
  session?: AuthSession;
  isAuthenticated: boolean;
  hydrated: boolean;
  loading: boolean;
  error?: string;

  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; message?: string; needsEmailConfirmation?: boolean }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ ok: boolean; message?: string }>;
  sendMagicLink: (email: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  setCloudSyncEnabled: (v: boolean) => Promise<void>;
  setPhotoUploadConsent: (v: boolean) => Promise<void>;
}

const DEFAULTS: AuthPrefs = {
  cloudSyncEnabled: false,
  photoUploadConsent: false,
};

async function persist(prefs: AuthPrefs): Promise<void> {
  await saveJSON(STORAGE_KEYS.consent, prefs);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isConfigured: authService.isConfigured(),
  session: undefined,
  isAuthenticated: false,
  cloudSyncEnabled: DEFAULTS.cloudSyncEnabled,
  photoUploadConsent: DEFAULTS.photoUploadConsent,
  hydrated: false,
  loading: false,

  async hydrate() {
    const prefs = await loadJSON<AuthPrefs>(STORAGE_KEYS.consent, DEFAULTS);
    const session = await authService.getSession().catch(() => undefined);
    set({
      ...prefs,
      session,
      isAuthenticated: !!session,
      hydrated: true,
      isConfigured: authService.isConfigured(),
    });

    // Live updates from Supabase
    authService.onAuthStateChange((next) => {
      set({ session: next, isAuthenticated: !!next });
    });
  },

  async signIn(email, password) {
    set({ loading: true, error: undefined });
    const res = await authService.signInWithPassword(email, password);
    if (!res.ok) {
      set({ loading: false, error: res.message });
      return { ok: false, message: res.message };
    }
    set({ loading: false, session: res.session, isAuthenticated: !!res.session });
    return { ok: true };
  },

  async signUp(email, password) {
    set({ loading: true, error: undefined });
    const res = await authService.signUpWithPassword(email, password);
    if (!res.ok) {
      set({ loading: false, error: res.message });
      return { ok: false, message: res.message };
    }
    set({ loading: false, session: res.session, isAuthenticated: !!res.session });
    return { ok: true, needsEmailConfirmation: res.needsEmailConfirmation };
  },

  async signInWithOAuth(provider) {
    set({ loading: true, error: undefined });
    const res = await authService.signInWithOAuthProvider(provider);
    set({ loading: false, error: res.ok ? undefined : res.message });
    return res.ok ? { ok: true } : { ok: false, message: res.message };
  },

  async sendMagicLink(email) {
    set({ loading: true, error: undefined });
    const res = await authService.sendMagicLink(email);
    set({ loading: false, error: res.ok ? undefined : res.message });
    return res.ok ? { ok: true } : { ok: false, message: res.message };
  },

  async signOut() {
    await authService.signOut();
    set({ session: undefined, isAuthenticated: false });
  },

  async setCloudSyncEnabled(v) {
    const next: AuthPrefs = { cloudSyncEnabled: v, photoUploadConsent: get().photoUploadConsent };
    // Disabling cloud sync also revokes photo upload consent for safety.
    if (!v) next.photoUploadConsent = false;
    await persist(next);
    set(next);
  },

  async setPhotoUploadConsent(v) {
    const next: AuthPrefs = { cloudSyncEnabled: get().cloudSyncEnabled, photoUploadConsent: v };
    // Photo upload requires cloud sync.
    if (v && !get().cloudSyncEnabled) next.cloudSyncEnabled = true;
    await persist(next);
    set(next);
  },
}));

export function canCloudSync(s: { isAuthenticated: boolean; cloudSyncEnabled: boolean; isConfigured: boolean }): boolean {
  return s.isConfigured && s.isAuthenticated && s.cloudSyncEnabled;
}

export function canUploadPhotos(s: {
  isAuthenticated: boolean;
  cloudSyncEnabled: boolean;
  photoUploadConsent: boolean;
  isConfigured: boolean;
}): boolean {
  return canCloudSync(s) && s.photoUploadConsent;
}
