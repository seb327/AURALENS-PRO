import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { APP_DISPLAY_NAME } from '@/constants/copy';
import { theme } from '@/constants/theme';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What we collect',
    body: `Only what you explicitly provide: camera scans you initiate, photos you upload, and the readings generated from them. ${APP_DISPLAY_NAME} does not track your face across sessions or build a biometric profile.`,
  },
  {
    title: 'Where it lives',
    body:
      'By default every reading lives on this device using encrypted local storage. Nothing leaves your phone until you explicitly turn on cloud sync in Settings.',
  },
  {
    title: 'If you enable cloud sync',
    body:
      'Your reading metadata (aura label, score, dominant colour, zone breakdown, guidance text) is stored in your private Supabase account under Row Level Security — only you can read it.',
  },
  {
    title: 'Photo uploads are opt-in',
    body:
      'Photos are never uploaded unless you separately enable "Upload photos" in Settings. When enabled, photos go to a private bucket; we never serve them publicly and only ever issue short-lived signed URLs.',
  },
  {
    title: 'What we never do',
    body:
      'We never sell face data. We never train models on your photos without explicit opt-in. We never share readings with third parties for marketing.',
  },
  {
    title: 'Your control',
    body:
      'Delete local readings, cloud readings, uploaded photos, your cloud account data, or everything — all from Settings → Delete My Data.',
  },
  {
    title: 'Not a diagnosis',
    body:
      'Aura readings are symbolic reflections. They are not medical, psychological, or diagnostic advice. If you are in crisis, contact local emergency services or a trusted person right now.',
  },
];

export default function Privacy() {
  return (
    <ScreenContainer orbColour="Green">
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>
      <Text style={styles.title}>Privacy</Text>
      {SECTIONS.map((s) => {
        const strong = /opt-in|control|never do/i.test(s.title);
        return (
          <GlassCard key={s.title} strong={strong}>
            <Text style={styles.h}>{s.title}</Text>
            <Text style={styles.b}>{s.body}</Text>
          </GlassCard>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 28, fontWeight: '300' },
  h: { color: theme.colors.auraGold, letterSpacing: 2, fontSize: 11, textTransform: 'uppercase', marginBottom: 8 },
  b: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22 },
});
