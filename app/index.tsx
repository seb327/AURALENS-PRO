import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PremiumButton } from '@/components/PremiumButton';
import { Eyebrow, Subtitle } from '@/components/DisplayText';
import { HeroScanExperience } from '@/components/HeroScanExperience';
import { CinematicHomeWeb } from '@/components/CinematicHomeWeb';
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
  // NOTE: <CinematicHomeWeb /> exists but is disabled — its ScrollTrigger
  // pin blocked the rest of the site from scrolling. Restore later by
  // wrapping it inside a tall outer container so other content sits below.
  // For now every platform uses the working two-column hero.
  return <NativeHero />;
}

function NativeHero() {
  const [w, setW] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setW(window.width));
    return () => sub.remove();
  }, []);
  const wide = w >= WIDE_BREAKPOINT;

  // GSAP cinematic intro — web only. Title 1 fades + de-blurs up, title 2
  // reveals via clip-path inset wipe, eyebrow + subtitle + CTAs stagger in,
  // scan device drops in with a slight rotation.
  const heroEnter = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || heroEnter.current) return;
    heroEnter.current = true;
    (async () => {
      try {
        const mod: any = await import('gsap');
        const gsap = mod.gsap ?? mod.default ?? mod;
        gsap.set('.gsap-eyebrow', { autoAlpha: 0, y: 12 });
        gsap.set('.gsap-title-1', { autoAlpha: 0, y: 40, filter: 'blur(18px)', scale: 0.92 });
        gsap.set('.gsap-title-2', { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' });
        gsap.set('.gsap-sub',     { autoAlpha: 0, y: 16 });
        gsap.set('.gsap-cta',     { autoAlpha: 0, y: 18, scale: 0.96 });
        gsap.set('.gsap-trust',   { autoAlpha: 0 });
        gsap.set('.gsap-scan',    { autoAlpha: 0, y: 60, rotationY: -8, scale: 0.94 });

        const tl = gsap.timeline({ delay: 0.15 });
        tl.to('.gsap-eyebrow', { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' })
          .to('.gsap-title-1', { autoAlpha: 1, y: 0, filter: 'blur(0px)', scale: 1, duration: 1.2, ease: 'expo.out' }, '-=0.35')
          .to('.gsap-title-2', { clipPath: 'inset(0 0% 0 0)', duration: 1.0, ease: 'power4.inOut' }, '-=0.85')
          .to('.gsap-sub',     { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.55')
          .to('.gsap-cta',     { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.2)', stagger: 0.10 }, '-=0.35')
          .to('.gsap-trust',   { autoAlpha: 1, duration: 0.5 }, '-=0.25')
          .to('.gsap-scan',    { autoAlpha: 1, y: 0, rotationY: 0, scale: 1, duration: 1.4, ease: 'expo.out' }, '-=1.4');
      } catch {
        // GSAP failed to load — just show the hero immediately.
        if (typeof document !== 'undefined') {
          document.querySelectorAll<HTMLElement>(
            '.gsap-eyebrow, .gsap-title-1, .gsap-title-2, .gsap-sub, .gsap-cta, .gsap-trust, .gsap-scan'
          ).forEach((el) => { el.style.opacity = '1'; el.style.visibility = 'visible'; el.style.transform = 'none'; el.style.clipPath = 'none'; el.style.filter = 'none'; });
        }
      }
    })();
  }, []);

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

      {/* Hero row — GSAP animates these classes (web only; native gets static). */}
      <View style={[styles.columns, wide && styles.columnsWide]}>
        <View style={[styles.left, wide && styles.leftWide]}>
          <View {...({ className: 'gsap-eyebrow' } as any)}>
            <Eyebrow>{HERO.eyebrow}</Eyebrow>
          </View>
          <View style={styles.titleBlock}>
            <Text
              {...({ className: 'gsap-title-1' } as any)}
              style={[styles.titleBase, wide ? styles.titleWide : styles.titleNarrow]}
            >
              {HERO.titleLine1}
            </Text>
            <Text
              {...({ className: 'gsap-title-2' } as any)}
              style={[styles.titleBase, wide ? styles.titleWide : styles.titleNarrow]}
            >
              {HERO.titleLine2}
            </Text>
          </View>
          <View {...({ className: 'gsap-sub' } as any)}>
            <Subtitle style={styles.sub}>{HERO.sub}</Subtitle>
          </View>

          <View style={[styles.ctaBlock, wide && styles.ctaBlockWide]}>
            <View {...({ className: 'gsap-cta' } as any)}>
              <PremiumButton
                label={HERO.primaryCta}
                onPress={() => router.push('/scan')}
                size="lg"
                fullWidth={!wide}
              />
            </View>
            <View {...({ className: 'gsap-cta' } as any)}>
              <PremiumButton
                label={HERO.secondaryCta}
                onPress={() => router.push('/technology')}
                variant="secondary"
                fullWidth={!wide}
              />
            </View>
          </View>

          <Text {...({ className: 'gsap-trust' } as any)} style={styles.trust}>{HERO.trust}</Text>
        </View>

        {wide && (
          <View {...({ className: 'gsap-scan' } as any)} style={styles.right}>
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
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2.0,
  },
  titleNarrow: {
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.4,
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
