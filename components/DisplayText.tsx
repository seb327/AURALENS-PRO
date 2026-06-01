// Premium display typography. Uses Fraunces (Google Fonts, loaded on web)
// for a serif display look — instantly lifts hero/result/pricing headlines
// out of the "default React Native sans-serif" feel.
//
// Tokens:
//   - eyebrow  : tight tracked uppercase micro-caps
//   - title    : large serif headline (Fraunces 300 weight)
//   - subtitle : muted body in Inter
//
// All three respect maxFontSizeMultiplier so dynamic-type users see the
// type scale gracefully without breaking the layout.

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

interface FadeUpProps {
  delay?: number;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

/** Mount-in fade + translate-up choreography. Used on hero / result / pricing. */
export function FadeUp({ delay = 0, children, style }: FadeUpProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 700,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translate]);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: translate }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function Eyebrow({ children, style, ...rest }: TextProps & { children: React.ReactNode }) {
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[styles.eyebrow, style]}
    >
      {children}
    </Text>
  );
}

interface DisplayTitleProps extends TextProps {
  children: React.ReactNode;
  size?: 'hero' | 'page' | 'card';
}

export function DisplayTitle({ children, size = 'page', style, ...rest }: DisplayTitleProps) {
  const sized =
    size === 'hero'  ? styles.hero  :
    size === 'card'  ? styles.card  :
                       styles.page;
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[styles.titleBase, sized, style]}
    >
      {children}
    </Text>
  );
}

export function Subtitle({ children, style, ...rest }: TextProps & { children: React.ReactNode }) {
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[styles.subtitle, style]}
    >
      {children}
    </Text>
  );
}

/** Subtle violet/gold glow halo behind a hero title. Web-friendly, native-safe. */
export function TitleHalo({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[haloStyles.wrap, style]}>
      <View pointerEvents="none" style={haloStyles.halo} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: theme.colors.auraGold,
    fontFamily: theme.font.body,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3.4,
    textTransform: 'uppercase',
  },
  titleBase: {
    color: theme.colors.softWhite,
    fontFamily: theme.font.display,
    fontWeight: '300',
  },
  hero: {
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.2,
  },
  page: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.6,
  },
  card: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  subtitle: {
    color: theme.colors.mute,
    fontFamily: theme.font.body,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '400',
  },
});

const haloStyles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    top: -20,
    left: -40,
    right: -40,
    bottom: -20,
    backgroundColor: 'rgba(155,108,255,0.10)',
    borderRadius: 999,
    // @ts-expect-error web-only filter for the lift effect
    filter: 'blur(60px)',
  },
});
