import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { copy } from '@/constants/copy';
import { theme } from '@/constants/theme';

export default function Technology() {
  return (
    <ScreenContainer orbColour="Blue" orbSecondary="Violet">
      <BackBar />

      <Text style={styles.title}>{copy.technology.title}</Text>
      <Text style={styles.intro}>{copy.technology.intro}</Text>

      <View style={styles.grid}>
        {copy.technology.cards.map((c) => (
          <GlassCard key={c.title} style={styles.cardHalf}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <Text style={styles.cardBody}>{c.body}</Text>
          </GlassCard>
        ))}
      </View>

      <GlassCard strong>
        <Text style={styles.sectionTitle}>{copy.technology.privacyTitle}</Text>
        {copy.technology.privacy.map((p) => (
          <View key={p} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{p}</Text>
          </View>
        ))}
      </GlassCard>

      <GlassCard>
        <Text style={styles.sectionTitle}>{copy.technology.disclaimerTitle}</Text>
        <Text style={styles.cardBody}>{copy.technology.disclaimer}</Text>
      </GlassCard>

      <PremiumButton label="See Pricing" onPress={() => router.push('/pricing')} />
    </ScreenContainer>
  );
}

function BackBar() {
  return (
    <View style={styles.backRow}>
      <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: {
    color: theme.colors.softWhite,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '300',
    marginTop: theme.spacing.md,
  },
  intro: {
    color: theme.colors.mute,
    fontSize: theme.size.body,
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  cardHalf: { flexBasis: '100%' },
  cardTitle: {
    color: theme.colors.auraGold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  cardBody: {
    color: theme.colors.softWhite,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    color: theme.colors.softWhite,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: theme.spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: theme.colors.auraGold,
    marginTop: 8,
  },
  bulletText: {
    color: theme.colors.mute,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
});
