import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
        <PremiumButton label="See pricing" onPress={() => router.push('/pricing')} variant="ghost" />
        <Text style={styles.trust}>{copy.hero.trust}</Text>
      </View>

      <View style={styles.footer}>
        <FooterLink label="Sign in" to="/auth" />
        <Text style={styles.footerDot}>·</Text>
        <FooterLink label="Settings" to="/settings" />
        <Text style={styles.footerDot}>·</Text>
        <FooterLink label="Privacy" to="/privacy" />
      </View>
    </ScreenContainer>
  );
}

function FooterLink({ label, to }: { label: string; to: string }) {
  return (
    <Pressable
      onPress={() => router.push(to as any)}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={10}
    >
      <Text style={styles.footerLink}>{label}</Text>
    </Pressable>
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
    marginTop: theme.spacing.xxxl + 16,
    gap: theme.spacing.lg,
  },
  eyebrow: {
    color: theme.colors.auraGold,
    letterSpacing: 3.5,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: theme.colors.softWhite,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '300',
    letterSpacing: -0.8,
    marginTop: 6,
  },
  sub: {
    color: theme.colors.mute,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  ctaBlock: {
    marginTop: theme.spacing.xxxl + 24,
    gap: 12,
  },
  trust: {
    color: theme.colors.dim,
    fontSize: theme.size.micro,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.4,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: theme.spacing.xxxl,
    paddingBottom: 8,
  },
  footerLink: {
    color: theme.colors.mute,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  footerDot: {
    color: theme.colors.dim,
    fontSize: 12,
  },
});
