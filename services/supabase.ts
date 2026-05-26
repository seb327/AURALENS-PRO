// Lazy Supabase client.
//
// The app is local-first. Supabase is only ever used when:
//   1. `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present, AND
//   2. the user has explicitly enabled cloud sync in settings.
//
// If either is missing, `getSupabase()` returns null and every sync service
// becomes a no-op. The rest of the app keeps working offline.

import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface ExpoExtra {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

function getConfig(): { url: string; key: string } | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  const url = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

let cached: SupabaseClient | null = null;
let configured = false;

export function isSupabaseConfigured(): boolean {
  if (configured) return true;
  return getConfig() !== null;
}

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const cfg = getConfig();
  if (!cfg) return null;
  cached = createClient(cfg.url, cfg.key, {
    auth: {
      storage: AsyncStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-app': 'auralens' },
    },
  });
  configured = true;
  return cached;
}

export function __setSupabaseForTests(client: SupabaseClient | null): void {
  cached = client;
  configured = client !== null;
}

export const READING_IMAGES_BUCKET = 'reading-images';
