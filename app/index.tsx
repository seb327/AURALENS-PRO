import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PremiumButton } from '@/components/PremiumButton';
import {
  DisplayTitle,
  Eyebrow,
  FadeUp,
  Subtitle,
} from '@/components/DisplayText';
import { HeroPreview } from '@/components/HeroPreview';
import { APP_DISPLAY_NAME, copy } from '@/constants/copy';
import { theme } from '@/constants/theme';

const WIDE_BREAKPOINT = 880;

export default function Hero() {
  const [w, setW] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setW(window.width);
    });
    return () => sub.remove();
  }, []);
  const wide = w >= WIDE_BREAKPOINT;

  return (
    <ScreenContainer orbColour="Violet" orbSecondary="Blue">
      <FadeUp delay={50}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>{APP_DISPLAY_NAME.toUpperCase()}</Text>
          <Text style={styles.brandSub}>by Vybstak</Text>
        </View>
      </FadeUp>

      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={[styles.left, wide && styles.leftWide]}>
          <FadeUp delay={180}>
            <Eyebrow>{copy.hero.eyebrow}</Eyebrow>
            <DisplayTitle size="hero" style={[styles.titleOverride, wide && styles.titleWide]}>
              {copy.hero.title}
            </DisplayTitle>
            <Subtitle style={styles.sub}>{copy.hero.sub}</Subtitle>
          </FadeUp>

          <FadeUp delay={360} style={[styles.ctaBlock, wide && styles.ctaBlockWide]}>
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
        </View>

        {wide && (
          <FadeUp delay={520} style={styles.right}>
            <HeroPreview />
          </FadeUp>
        )}
      </View>

      <FadeUp delay={680} style={styles.footer}>
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
  columns: {
    marginTop: theme.spacing.xxxl,
    gap: theme.spacing.xl,
  },
  columnsWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.xxxl + 24,
  },
  left: {
    gap: theme.spacing.lg,
  },
  leftWide: {
    flex: 1.05,
    minHeight: 480,
    justifyContent: 'center',
  },
  right: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleOverride: {
    marginTop: 12,
  },
  titleWide: {
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -1.6,
  },
  sub: {
    marginTop: 18,
    maxWidth: 520,
  },
  ctaBlock: {
    marginTop: theme.spacing.xl,
    gap: 14,
  },
  ctaBlockWide: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: theme.spacing.xl + 8,
    maxWidth: 380,
  },
  trust: {
    color: theme.colors.dim,
    fontSize: theme.size.micro,
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
