import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { copy } from '@/constants/copy';
import { theme } from '@/constants/theme';
import { useEntitlementStore, canStartReading } from '@/store/useEntitlementStore';

const SLOT_HINTS = [
  'Front-facing, soft light',
  'Natural, relaxed',
  'A different chapter of your life',
];

export default function Upload() {
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const ent = useEntitlementStore((s) => ({ hasMonthly: s.hasMonthly, readingCredits: s.readingCredits }));

  async function pickAt(idx: number) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access', 'Please enable photo access to upload images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (res.canceled) return;
    const uri = res.assets[0]?.uri;
    if (!uri) return;
    setSlots((prev) => prev.map((s, i) => (i === idx ? uri : s)));
  }

  async function submit() {
    if (slots.some((s) => !s)) {
      Alert.alert('Three photos needed', 'Please add all three photos to continue.');
      return;
    }
    if (!canStartReading(ent)) {
      router.replace('/pricing');
      return;
    }
    // Credit is consumed inside processing only on success.
    router.push({
      pathname: '/processing',
      params: { inputType: 'upload', uris: JSON.stringify(slots) },
    });
  }

  return (
    <ScreenContainer orbColour="Green" orbSecondary="Gold">
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>
      <Text style={styles.title}>{copy.upload.title}</Text>
      <Text style={styles.sub}>{copy.upload.sub}</Text>

      <GlassCard>
        <View style={styles.slotsRow}>
          {slots.map((uri, i) => (
            <Pressable
              key={i}
              style={styles.slot}
              onPress={() => pickAt(i)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${SLOT_HINTS[i]} photo`}
              accessibilityHint={uri ? 'Double tap to replace the selected photo' : 'Double tap to pick a photo'}
              accessibilityState={{ selected: !!uri }}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.slotImg} accessible accessibilityIgnoresInvertColors />
              ) : (
                <Text style={styles.slotPlus} accessible={false}>+</Text>
              )}
            </Pressable>
          ))}
        </View>
        <View style={styles.hintsRow}>
          {SLOT_HINTS.map((h, i) => (
            <Text key={i} style={styles.hint}>{i + 1}. {h}</Text>
          ))}
        </View>
      </GlassCard>

      <PremiumButton label={copy.upload.cta} onPress={submit} />
      <Text style={styles.foot}>{copy.disclaimers.short}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 28, fontWeight: '300' },
  sub: { color: theme.colors.mute, fontSize: 14, lineHeight: 21 },
  slotsRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  slot: {
    flex: 1, aspectRatio: 3 / 4,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  slotImg: { width: '100%', height: '100%' },
  slotPlus: { color: theme.colors.auraGold, fontSize: 28, fontWeight: '200' },
  hintsRow: { marginTop: theme.spacing.md, gap: 4 },
  hint: { color: theme.colors.dim, fontSize: 12 },
  foot: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', marginTop: 12 },
});
