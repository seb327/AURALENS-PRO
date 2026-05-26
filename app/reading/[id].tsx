import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { ReadingCard } from '@/components/ReadingCard';
import { theme } from '@/constants/theme';
import { useReadingStore } from '@/store/useReadingStore';
import { useEntitlementStore } from '@/store/useEntitlementStore';

export default function ReadingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reading = useReadingStore((s) => s.readings.find((r) => r.readingId === id));
  const remove = useReadingStore((s) => s.remove);
  const hasMonthly = useEntitlementStore((s) => s.hasMonthly);

  if (!reading) {
    return (
      <ScreenContainer>
        <View style={styles.backRow}>
          <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
        </View>
        <Text style={styles.notFound}>This reading is no longer available on this device.</Text>
        <PremiumButton label="Back to Timeline" onPress={() => router.replace('/timeline')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      orbColour={reading.auraResult.dominantColour}
      orbSecondary={reading.auraResult.secondaryColour}
    >
      <View style={styles.backRow}>
        <PremiumButton label="← Timeline" onPress={() => router.back()} variant="subtle" />
      </View>

      <ReadingCard reading={reading} />

      <GlassCard>
        <Text style={styles.h}>Guidance details</Text>
        <Text style={styles.eyebrow}>Maintain</Text>
        {reading.guidance.maintainGoodEnergy.map((g) => (
          <Text key={g} style={styles.bullet}>• {g}</Text>
        ))}
        <Text style={[styles.eyebrow, { marginTop: 12 }]}>Release</Text>
        {reading.guidance.reduceHeavyEnergy.map((g) => (
          <Text key={g} style={styles.bullet}>• {g}</Text>
        ))}
        <Text style={[styles.eyebrow, { marginTop: 12 }]}>Daily practice</Text>
        <Text style={styles.body}>{reading.guidance.dailyPractice}</Text>
        <Text style={[styles.eyebrow, { marginTop: 12 }]}>Reflection</Text>
        <Text style={[styles.body, { fontStyle: 'italic' }]}>{reading.guidance.reflectionQuestion}</Text>
      </GlassCard>

      {hasMonthly && (
        <PremiumButton label="Ask Aura Buddy about this reading" onPress={() => router.push('/buddy')} />
      )}
      <PremiumButton label="Compare with another reading" onPress={() => router.push({ pathname: '/compare', params: { fromId: reading.readingId } })} variant="ghost" />
      <PremiumButton
        label="Delete this reading"
        onPress={async () => {
          await remove(reading.readingId);
          router.replace('/timeline');
        }}
        variant="subtle"
      />

      <Text style={styles.dis}>{reading.disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  notFound: { color: theme.colors.softWhite, fontSize: 16, lineHeight: 24, marginVertical: theme.spacing.lg },
  h: { color: theme.colors.softWhite, fontSize: 16, fontWeight: '500', marginBottom: 12 },
  eyebrow: { color: theme.colors.auraGold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  bullet: { color: theme.colors.softWhite, fontSize: 13, lineHeight: 20, marginTop: 4 },
  body: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 21, marginTop: 4 },
  dis: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: theme.spacing.lg },
});
