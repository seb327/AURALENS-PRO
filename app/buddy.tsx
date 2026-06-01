import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { AuraOrb } from '@/components/AuraOrb';
import { copy } from '@/constants/copy';
import { theme } from '@/constants/theme';
import { useEntitlementStore, canAccessMonthlyFeatures } from '@/store/useEntitlementStore';
import { useReadingStore } from '@/store/useReadingStore';
import { useBuddyStore } from '@/store/useBuddyStore';
import type { AuraColourKey } from '@/constants/theme';

export default function Buddy() {
  const hasMonthly = useEntitlementStore((s) => s.hasMonthly);
  const lastReading = useReadingStore((s) => s.readings[0]);
  const buddy = useBuddyStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!buddy.hydrated) buddy.hydrate();
  }, [buddy]);

  useEffect(() => {
    if (buddy.hydrated && buddy.messages.length === 0) {
      buddy.seedIntro(lastReading);
    }
  }, [buddy.hydrated, buddy.messages.length, lastReading, buddy]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [buddy.messages.length, buddy.sending]);

  if (!canAccessMonthlyFeatures({ hasMonthly })) {
    return (
      <ScreenContainer orbColour="Indigo">
        <View style={styles.backRow}>
          <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
        </View>
        <Text style={styles.title}>Aura Buddy</Text>
        <GlassCard strong>
          <Text style={styles.lockTitle}>Monthly only</Text>
          <Text style={styles.lockBody}>
            Your calm companion for maintaining clearer energy. Available with AuraLens Monthly.
          </Text>
          <PremiumButton label="Unlock with Monthly" onPress={() => router.push('/pricing')} />
        </GlassCard>
      </ScreenContainer>
    );
  }

  const orbColour: AuraColourKey = (lastReading?.auraResult.dominantColour ?? 'Violet') as AuraColourKey;
  const orbSecondary: AuraColourKey = (lastReading?.auraResult.secondaryColour ?? 'Blue') as AuraColourKey;

  async function send() {
    const t = input.trim();
    if (!t || buddy.sending) return;
    setInput('');
    await buddy.send(t, lastReading);
  }

  return (
    <ScreenContainer scroll={false} orb orbColour={orbColour} orbSecondary={orbSecondary}>
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{copy.buddy.title}</Text>
        {__DEV__ && (() => {
          const last = [...buddy.messages].reverse().find((m) => m.role === 'buddy');
          const mode = last?.source === 'remote' ? 'LIVE EDGE FN' : last?.source === 'fallback' ? 'LOCAL FALLBACK' : 'READY';
          const tone =
            last?.source === 'remote' ? styles.modeOk :
            last?.source === 'fallback' ? styles.modeWarn :
            styles.modeReady;
          return (
            <View style={[styles.modePill, tone]}>
              <Text style={[styles.modePillText, tone]}>{mode}</Text>
            </View>
          );
        })()}
      </View>

      {lastReading && (
        <GlassCard>
          <Text style={styles.contextEyebrow}>Reading context</Text>
          <Text style={styles.contextLine}>
            {lastReading.auraResult.label} · {lastReading.auraResult.score}/100 · {lastReading.auraResult.dominantColour}
          </Text>
          <Text style={styles.contextSummary} numberOfLines={2}>
            {lastReading.guidance.summary}
          </Text>
        </GlassCard>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
          {buddy.messages.map((m) => (
            <View
              key={m.id}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${m.role === 'user' ? 'You' : 'Aura Buddy'} said: ${m.content}`}
              style={[styles.bubble, m.role === 'user' ? styles.user : styles.buddyBubble]}
            >
              <Text style={[styles.bubbleText, m.role === 'user' && styles.userText]}>{m.content}</Text>
              {!!m.practices?.length && (
                <View style={styles.chipsRow}>
                  {m.practices.map((p) => (
                    <View key={p} style={styles.chip}>
                      <Text style={styles.chipText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!!m.reflectionQuestion && (
                <View style={styles.reflectionCard}>
                  <Text style={styles.reflectionEyebrow}>Reflection</Text>
                  <Text style={styles.reflectionText}>{m.reflectionQuestion}</Text>
                </View>
              )}
              {m.source === 'fallback' && m.role === 'buddy' && (
                <Text style={styles.fallbackTag}>Offline reflection — using local guidance</Text>
              )}
            </View>
          ))}

          {buddy.sending && (
            <View
              style={styles.typing}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel="Aura Buddy is composing a reply"
            >
              <AuraOrb size={28} colour={orbColour} secondary={orbSecondary} />
              <Text style={styles.typingText}>Aura Buddy is reflecting…</Text>
            </View>
          )}

          {buddy.error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>
                {buddy.requiresMonthly ? 'Subscription needed' : buddy.rateLimited ? 'Limit reached' : 'Something went wrong'}
              </Text>
              <Text style={styles.errorBody}>{buddy.error}</Text>
              {buddy.requiresMonthly && (
                <Pressable
                  onPress={() => router.push('/pricing')}
                  accessibilityRole="button"
                  accessibilityLabel="See pricing"
                  accessibilityHint="Opens the AuraLens Monthly subscription screen"
                  style={styles.errorAction}
                >
                  <Text style={styles.errorActionText}>See pricing</Text>
                </Pressable>
              )}
            </View>
          )}

          <Text style={styles.crisis}>{copy.buddy.crisis}</Text>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type something honest"
            placeholderTextColor={theme.colors.dim}
            style={styles.input}
            multiline
            editable={!buddy.sending}
            accessibilityLabel="Message to Aura Buddy"
            accessibilityHint="Type your message and tap Send"
            maxFontSizeMultiplier={1.4}
          />
          <PremiumButton label={buddy.sending ? 'Sending…' : 'Send'} onPress={send} disabled={buddy.sending} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 28, fontWeight: '300', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modePill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  modePillText: { fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },
  modeOk:    { borderColor: 'rgba(102,224,163,0.5)', backgroundColor: 'rgba(102,224,163,0.10)', color: theme.colors.auraGreen },
  modeWarn:  { borderColor: 'rgba(244,199,107,0.5)', backgroundColor: 'rgba(244,199,107,0.10)', color: theme.colors.auraGold },
  modeReady: { borderColor: theme.colors.hairline, backgroundColor: 'rgba(255,255,255,0.04)', color: theme.colors.mute },
  kav: { flex: 1 },
  thread: { gap: 10, paddingBottom: 20 },
  bubble: {
    padding: 14,
    borderRadius: theme.radius.md,
    maxWidth: '92%',
    borderWidth: StyleSheet.hairlineWidth,
  },
  buddyBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(155,108,255,0.10)',
    borderColor: 'rgba(155,108,255,0.30)',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(244,199,107,0.10)',
    borderColor: 'rgba(244,199,107,0.35)',
  },
  bubbleText: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 21 },
  userText: { color: theme.colors.auraGold },
  contextEyebrow: { color: theme.colors.auraGold, letterSpacing: 2, fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
  contextLine: { color: theme.colors.softWhite, fontSize: 13, fontWeight: '500' },
  contextSummary: { color: theme.colors.mute, fontSize: 12, lineHeight: 18, marginTop: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.4)',
    backgroundColor: 'rgba(244,199,107,0.05)',
  },
  chipText: { color: theme.colors.auraGold, fontSize: 11, letterSpacing: 0.5 },
  reflectionCard: {
    marginTop: 12, padding: 10,
    borderLeftWidth: 2, borderLeftColor: theme.colors.auraGold,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
  },
  reflectionEyebrow: { color: theme.colors.auraGold, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  reflectionText: { color: theme.colors.softWhite, fontSize: 13, lineHeight: 19, marginTop: 4, fontStyle: 'italic' },
  fallbackTag: { color: theme.colors.dim, fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingVertical: 8 },
  typingText: { color: theme.colors.mute, fontSize: 13 },
  errorCard: {
    padding: 12, borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(196,82,42,0.4)',
    backgroundColor: 'rgba(196,82,42,0.08)',
  },
  errorTitle: { color: theme.colors.auraRed, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  errorBody: { color: theme.colors.softWhite, fontSize: 13, lineHeight: 19, marginTop: 6 },
  errorAction: { marginTop: 10, alignSelf: 'flex-start' },
  errorActionText: { color: theme.colors.auraGold, fontSize: 13, letterSpacing: 0.5 },
  crisis: { color: theme.colors.dim, fontSize: 11, marginTop: 12, lineHeight: 16, fontStyle: 'italic' },
  composer: { gap: 8, paddingTop: 12 },
  input: {
    color: theme.colors.softWhite,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: theme.colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: 14,
    maxHeight: 120,
    fontSize: 14,
  },
  lockTitle: { color: theme.colors.auraGold, letterSpacing: 2, fontSize: 11, textTransform: 'uppercase', marginBottom: 8 },
  lockBody: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22, marginBottom: 16 },
});
