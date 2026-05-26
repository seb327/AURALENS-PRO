import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PremiumButton } from '@/components/PremiumButton';
import { APP_DISPLAY_NAME, copy } from '@/constants/copy';
import { theme } from '@/constants/theme';

export default function Hero() {
  return (
    <ScreenContainer orbColour="Violet" orbSecondary="Blue">
      <View style={styles.headerRow}>
        <Text style={styles.brand}>{APP_DISPLAY_NAME.toUpperCase()}</Text>
        <Text style={styles.brandSub}>by Vybstak</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{copy.hero.eyebrow}</Text>
        <Text style={styles.title}>{copy.hero.title}</Text>
        <Text style={styles.sub}>{copy.hero.sub}</Text>
      </View>

      <View style={styles.ctaBlock}>
        <PremiumButton label={copy.hero.cta} onPress={() => router.push('/technology')} />
        <PremiumButton label={copy.hero.restoreCta} onPress={() => router.push('/settings')} variant="subtle" />
      </View>

      <Text style={styles.foot}>{copy.disclaimers.short}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  brand: {
    color: theme.colors.softWhite,
    letterSpacing: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  brandSub: {
    color: theme.colors.dim,
    letterSpacing: 2,
    fontSize: 11,
  },
  hero: {
    marginTop: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  eyebrow: {
    color: theme.colors.auraGold,
    letterSpacing: 3,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.softWhite,
    fontSize: theme.size.h1,
    lineHeight: 46,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  sub: {
    color: theme.colors.mute,
    fontSize: theme.size.body,
    lineHeight: 24,
    marginTop: theme.spacing.sm,
  },
  ctaBlock: {
    marginTop: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  foot: {
    color: theme.colors.dim,
    fontSize: theme.size.micro,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    lineHeight: 16,
  },
});
