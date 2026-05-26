import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS, loadJSON, removeKey, saveJSON } from '@/services/storage';
import { aiBuddyService } from '@/services/aiBuddyService';
import {
  buildBuddyContextFromReading,
  type AiBuddyResponse,
  type BuddyTurn,
} from '@/types/buddy';
import type { AuraReading } from '@/types/aura';

interface BuddyMessage extends BuddyTurn {
  id: string;
  at: string;
  practices?: string[];
  reflectionQuestion?: string;
  tone?: AiBuddyResponse['tone'];
  crisisDetected?: boolean;
  source?: 'remote' | 'fallback';
}

interface BuddyState {
  messages: BuddyMessage[];
  hydrated: boolean;
  sending: boolean;
  error?: string;
  rateLimited: boolean;
  requiresMonthly: boolean;

  hydrate: () => Promise<void>;
  send: (text: string, reading: AuraReading | undefined) => Promise<void>;
  clear: () => Promise<void>;
  seedIntro: (reading: AuraReading | undefined) => void;
}

function newId(): string {
  const u = (Crypto.randomUUID?.() as string | undefined);
  return u ?? `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const INTRO_ID = 'intro';

export const useBuddyStore = create<BuddyState>((set, get) => ({
  messages: [],
  hydrated: false,
  sending: false,
  rateLimited: false,
  requiresMonthly: false,

  async hydrate() {
    const msgs = await loadJSON<BuddyMessage[]>(STORAGE_KEYS.buddy, []);
    set({ messages: msgs, hydrated: true });
  },

  seedIntro(reading) {
    if (get().messages.length > 0) return;
    const intro: BuddyMessage = {
      id: INTRO_ID,
      role: 'buddy',
      at: new Date().toISOString(),
      content: reading
        ? `Hi, I'm Aura Buddy. I can see your most recent reading was ${reading.auraResult.label.toLowerCase()} with a ${reading.auraResult.dominantColour.toLowerCase()} signature. What is on your mind today?`
        : `Hi, I'm Aura Buddy. I'm here for reflection and small practical practices, not medical or psychological advice. Start a reading first and I'll have more to reflect with you.`,
      tone: 'calm',
    };
    set({ messages: [intro] });
  },

  async send(text, reading) {
    const trimmed = text.trim();
    if (!trimmed) return;
    set({ sending: true, error: undefined, rateLimited: false, requiresMonthly: false });

    const userMsg: BuddyMessage = {
      id: newId(),
      role: 'user',
      at: new Date().toISOString(),
      content: trimmed,
    };
    const optimistic = [...get().messages, userMsg];
    set({ messages: optimistic });

    const context = buildBuddyContextFromReading(reading);
    // History excludes the canned intro and the just-added user message;
    // the LLM receives the new user message as `message`, not in history.
    const history: BuddyTurn[] = optimistic
      .filter((m) => m.id !== INTRO_ID && m.id !== userMsg.id)
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await aiBuddyService.send(trimmed, context, history);

    if (!result.ok) {
      set({
        sending: false,
        error: result.message,
        rateLimited: !!result.rateLimited,
        requiresMonthly: !!result.requiresMonthly,
      });
      await saveJSON(STORAGE_KEYS.buddy, get().messages);
      return;
    }

    const r = result.response;
    const buddyMsg: BuddyMessage = {
      id: newId(),
      role: 'buddy',
      at: new Date().toISOString(),
      content: r.reply,
      practices: r.suggestedPractices,
      reflectionQuestion: r.reflectionQuestion,
      tone: r.tone,
      crisisDetected: r.crisisDetected,
      source: result.source,
    };
    const all = [...get().messages, buddyMsg];
    set({ messages: all, sending: false });
    await saveJSON(STORAGE_KEYS.buddy, all);
  },

  async clear() {
    await removeKey(STORAGE_KEYS.buddy);
    set({ messages: [], error: undefined, rateLimited: false, requiresMonthly: false });
  },
}));
