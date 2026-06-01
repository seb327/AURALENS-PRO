import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PremiumButton } from '@/components/PremiumButton';
import {
  DisplayTitle,
  Eyebrow,
  FadeUp,
  Subtitle,
  TitleHalo,
} from '@/components/DisplayText';
import { APP_DISPLAY_NAME, copy } from '@/constants/copy';
import { theme } from '@/constants/theme';

export default function Hero() {
  return (
    <ScreenContainer orbColour="Violet" orbSecondary="Blue">
      <FadeUp delay={50}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>{APP_DISPLAY_NAME.toUpperCase()}</Text>
          <Text style={styles.brandSub}>by Vybstak</Text>
        </View>
      </FadeUp>

      <FadeUp delay={180} style={styles.hero}>
        <Eyebrow>{copy.hero.eyebrow}</Eyebrow>
        <TitleHalo>
          <DisplayTitle size="hero" style={styles.titleOverride}>
            {copy.hero.title}
          </DisplayTitle>
        </TitleHalo>
        <Subtitle style={styles.sub}>{copy.hero.sub}</Subtitle>
      </FadeUp>

      <FadeUp delay={360} style={styles.ctaBlock}>
        <PremiumButton
          label="Start My Free Reading"
          onPress={() => router.push('/scan')}
          size="lg"
          fullWidth
        />
        <PremiumButton
          label="How it works"
          onPress={() => router.push('/technology')}
          variant="secondary"
          fullWidth
        />
        <Text style={styles.trust}>{copy.hero.trust}</Text>
      </FadeUp>

      <FadeUp delay={540} style={styles.footer}>
        <FooterLink label="Sign in" to="/auth" />
        <Text style={styles.footerDot}>·</Text>
        <FooterLink label="Pricing" to="/pricing" />
        <Text style={styles.footerDot}>·</Text>
        <FooterLink label="Settings" to="/settings" />
        <Text style={styles.footerDot}>·</Text>
        <FooterLink label="Privacy" to="/privacy" />
      </FadeUp>
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
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.font.body,
  },
  brandSub: {
    color: theme.colors.dim,
    letterSpacing: 2,
    fontSize: 11,
    fontFamily: theme.font.body,
  },
  hero: {
    marginTop: theme.spacing.xxxl,
    gap: theme.spacing.lg,
  },
  titleOverride: {
    marginTop: 8,
  },
  sub: {
    marginTop: 12,
    maxWidth: 560,
  },
  ctaBlock: {
    marginTop: theme.spacing.xxxl + 12,
    gap: 14,
  },
  trust: {
    color: theme.colors.dim,
    fontSize: theme.size.micro,
    textAlign: 'center',
    lineHeight: 17,
    letterSpacing: 0.5,
    marginTop: 8,
    fontFamily: theme.font.body,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: theme.spacing.xxxl,
    paddingBottom: 12,
  },
  footerLink: {
    color: theme.colors.mute,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: theme.font.body,
  },
  footerDot: {
    color: theme.colors.dim,
    fontSize: 11,
  },
});
