import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PremiumButton } from '@/components/PremiumButton';
import { Eyebrow, Subtitle } from '@/components/DisplayText';
import { HeroScanExperience } from '@/components/HeroScanExperience';
import { APP_DISPLAY_NAME } from '@/constants/copy';
import { theme } from '@/constants/theme';

const WIDE_BREAKPOINT = 980;

const HERO = {
  eyebrow: 'SYMBOLIC AURA REFLECTION',
  titleLine1: 'Do you carry a calm aura,',
  titleLine2: 'or a heavy one?',
  sub: 'A private symbolic face reading that reflects your visual energy profile in seconds.',
  primaryCta: 'Begin My Reading',
  secondaryCta: 'See How It Works',
  trust: 'For reflection and wellbeing only. Not medical or diagnostic advice.',
};

export default function Hero() {
  const [w, setW] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setW(window.width));
    return () => sub.remove();
  }, []);
  const wide = w >= WIDE_BREAKPOINT;

  return (
    <ScreenContainer orbColour="Violet" orbSecondary="Blue">
      {/* Top nav strip */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>{APP_DISPLAY_NAME.toUpperCase()}</Text>
          <Text style={styles.brandSub}>by Vybstak</Text>
        </View>
        <View style={styles.topLinks}>
          <TopLink label="Pricing" to="/pricing" />
          <TopLink label="Sign in" to="/auth" />
        </View>
      </View>

      {/* Hero row — NO animation on the text. Static = guaranteed no ghosting. */}
      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={[styles.left, wide && styles.leftWide]}>
          <Eyebrow>{HERO.eyebrow}</Eyebrow>
          <View style={styles.titleBlock}>
            <Text style={[styles.titleBase, wide ? styles.titleWide : styles.titleNarrow]}>
              {HERO.titleLine1}
            </Text>
            <Text style={[styles.titleBase, wide ? styles.titleWide : styles.titleNarrow]}>
              {HERO.titleLine2}
            </Text>
          </View>
          <Subtitle style={styles.sub}>{HERO.sub}</Subtitle>

          <View style={[styles.ctaBlock, wide && styles.ctaBlockWide]}>
            <PremiumButton
              label={HERO.primaryCta}
              onPress={() => router.push('/scan')}
              size="lg"
              fullWidth={!wide}
            />
            <PremiumButton
              label={HERO.secondaryCta}
              onPress={() => router.push('/technology')}
              variant="secondary"
              fullWidth={!wide}
            />
          </View>

          <Text style={styles.trust}>{HERO.trust}</Text>
        </View>

        {wide && (
          <View style={styles.right}>
            <HeroScanExperience />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <FooterLink label="Settings" to="/settings" />
        <Text style={styles.footerDot}>·</Text>
        <FooterLink label="Privacy" to="/privacy" />
        <Text style={styles.footerDot}>·</Text>
        <FooterLink label="Technology" to="/technology" />
      </View>
    </ScreenContainer>
  );
}

function TopLink({ label, to }: { label: string; to: string }) {
  return (
    <Pressable
      onPress={() => router.push(to as any)}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.topLink}>{label}</Text>
    </Pressable>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  brand: {
    color: theme.colors.softWhite,
    letterSpacing: 4,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.font.body,
  },
  brandSub: {
    color: theme.colors.dim,
    letterSpacing: 2,
    fontSize: 10,
    fontFamily: theme.font.body,
  },
  topLinks: { flexDirection: 'row', gap: 28 },
  topLink: {
    color: theme.colors.mute,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: theme.font.body,
  },

  columns: {
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  columnsWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxl,
    marginTop: theme.spacing.xxl + 8,
    minHeight: 580,
  },
  left: {
    gap: theme.spacing.lg,
  },
  leftWide: {
    flex: 1.05,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  right: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleBase: {
    color: theme.colors.softWhite,
    fontFamily: theme.font.display,
    // Heavy Apple-style display weight. Inter 800 reads like SF Pro Display
    // Heavy. Combined with tight negative tracking this gives the keynote
    // poster feel you see on apple.com Vision Pro pages.
    fontWeight: '800',
  },
  titleBlock: { marginTop: 14, gap: 0 },
  titleWide: {
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -2.4,
  },
  titleNarrow: {
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.6,
  },
  sub: {
    marginTop: 22,
    maxWidth: 520,
  },
  ctaBlock: {
    marginTop: theme.spacing.xl,
    gap: 12,
  },
  ctaBlockWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginTop: theme.spacing.xl + 4,
  },
  trust: {
    color: theme.colors.dim,
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 0.5,
    marginTop: 18,
    fontFamily: theme.font.body,
    maxWidth: 420,
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
