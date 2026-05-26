import * as FileSystem from 'expo-file-system';
import { getSupabase, READING_IMAGES_BUCKET } from './supabase';

export interface UploadContext {
  userId: string;
  readingId: string;
  cloudSyncEnabled: boolean;
  photoUploadConsent: boolean;
}

export interface UploadedImage {
  storagePath: string;
  signedUrl?: string;
}

export const cloudStorageService = {
  /**
   * Uploads an image only if cloudSync is enabled AND photo upload consent is given.
   * Returns null in every other case — never throws.
   */
  async uploadIfAllowed(localUri: string, ctx: UploadContext): Promise<UploadedImage | null> {
    if (!ctx.cloudSyncEnabled || !ctx.photoUploadConsent) return null;
    const sb = getSupabase();
    if (!sb) return null;

    try {
      const ext = (localUri.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${ctx.userId}/${ctx.readingId}/${Date.now()}.${ext}`;

      // Read the file from local FS and upload as ArrayBuffer.
      const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes = decodeBase64(base64);

      const { error } = await sb.storage
        .from(READING_IMAGES_BUCKET)
        .upload(path, bytes, {
          contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
          upsert: false,
        });
      if (error) return null;

      // Record the image row.
      const { error: insertErr } = await sb.from('reading_images').insert({
        user_id: ctx.userId,
        reading_id: ctx.readingId,
        storage_path: path,
        consent_given: true,
      });
      if (insertErr) {
        // best-effort cleanup
        await sb.storage.from(READING_IMAGES_BUCKET).remove([path]).catch(() => {});
        return null;
      }

      return { storagePath: path };
    } catch {
      return null;
    }
  },

  async getSignedUrl(path: string, expiresInSeconds = 60 * 10): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.storage
      .from(READING_IMAGES_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error) return null;
    return data?.signedUrl ?? null;
  },

  async deleteAllForUser(userId: string): Promise<{ deletedFiles: number; ok: boolean }> {
    const sb = getSupabase();
    if (!sb) return { deletedFiles: 0, ok: false };
    const { data: rows, error } = await sb
      .from('reading_images')
      .select('storage_path')
      .eq('user_id', userId);
    if (error) return { deletedFiles: 0, ok: false };
    const paths = (rows ?? []).map((r: any) => r.storage_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      await sb.storage.from(READING_IMAGES_BUCKET).remove(paths).catch(() => {});
    }
    try { await sb.from('reading_images').delete().eq('user_id', userId); } catch {}
    return { deletedFiles: paths.length, ok: true };
  },
};

// Minimal base64 → Uint8Array. Avoids pulling in a polyfill just for upload.
function decodeBase64(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup: Record<string, number> = {};
  for (let i = 0; i < chars.length; i++) lookup[chars[i]!] = i;
  let bufferLength = b64.length * 0.75;
  const len = b64.length;
  if (b64[len - 1] === '=') bufferLength--;
  if (b64[len - 2] === '=') bufferLength--;
  const arraybuffer = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = lookup[b64[i]!] ?? 0;
    const e2 = lookup[b64[i + 1]!] ?? 0;
    const e3 = lookup[b64[i + 2]!] ?? 0;
    const e4 = lookup[b64[i + 3]!] ?? 0;
    arraybuffer[p++] = (e1 << 2) | (e2 >> 4);
    arraybuffer[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    arraybuffer[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return arraybuffer;
}
