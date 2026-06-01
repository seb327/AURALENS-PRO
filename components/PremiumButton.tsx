import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];

  /** Override the screen-reader label. Defaults to `label` (strips leading symbols). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'imagebutton';
  testID?: string;
}

// Strip ornamental glyphs like "← ", "✕ ", "✦ " so the screen reader doesn't
// announce "left pointing arrow Back" — it just says "Back".
function cleanLabel(raw: string): string {
  return raw.replace(/^[^\p{L}\p{N}]+/u, '').trim() || raw;
}

const SIZE_PADDING: Record<ButtonSize, { v: number; h: number; font: number }> = {
  sm: { v: 10, h: 18, font: 13 },
  md: { v: 14, h: 24, font: 15 },
  lg: { v: 18, h: 30, font: 16 },
};

export function PremiumButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  icon,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const inactive = disabled || loading;

  // Respect the OS reduced-motion preference.
  const reduceMotionRef = useRef(false);
  useMemo(() => {
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { reduceMotionRef.current = !!v; })
      .catch(() => {});
  }, []);

  const animate = (to: number) => {
    if (reduceMotionRef.current) return;
    Animated.timing(scale, {
      toValue: to,
      duration: theme.motion.press,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePress = () => {
    if (inactive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Web fallback — Vibration API where supported. Silent if not.
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      try { (navigator as any).vibrate?.(20); } catch { /* swallow */ }
      // Light shader bloom on every press for kinetic feedback.
      try { (window as any).auralensEnergyPulse?.(0.45); } catch { /* swallow */ }
    }
    onPress();
  };

  const a11y = {
    accessible: true,
    accessibilityLabel: accessibilityLabel ?? cleanLabel(label),
    accessibilityHint,
    accessibilityRole,
    accessibilityState: { disabled: !!inactive, busy: !!loading },
    testID,
    hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } as const,
  };

  const pad = SIZE_PADDING[size];
  const widthStyle: ViewStyle = fullWidth ? { alignSelf: 'stretch' } : {};
  const baseDisabled = inactive ? styles.disabled : null;

  const content = (labelColor: string) => {
    if (loading) {
      return <ActivityIndicator color={labelColor} size="small" />;
    }
    if (icon) {
      return (
        <View style={styles.row}>
          <View style={styles.iconWrap}>{icon}</View>
          <Text
            style={[styles.labelBase, { color: labelColor, fontSize: pad.font }]}
            maxFontSizeMultiplier={1.3}
            allowFontScaling
          >
            {label}
          </Text>
        </View>
      );
    }
    return (
      <Text
        style={[styles.labelBase, { color: labelColor, fontSize: pad.font }]}
        maxFontSizeMultiplier={1.3}
        allowFontScaling
      >
        {label}
      </Text>
    );
  };

  // ── PRIMARY ────────────────────────────────────────────────────────────
  // Luxury treatment: deep obsidian face, thin gold gradient border, gold
  // text. Reads like a high-end watch or fragrance brand button — quietly
  // expensive, not bright yellow plastic.
  if (variant === 'primary') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, widthStyle, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={() => animate(0.97)}
          onPressOut={() => animate(1)}
          disabled={inactive}
          {...a11y}
          style={[styles.primaryWrap, theme.shadow.glowGold, baseDisabled]}
        >
          <LinearGradient
            colors={theme.gradients.gold as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBorder}
          >
            <View style={[styles.primaryFace, { paddingVertical: pad.v, paddingHorizontal: pad.h }]}>
              {content(theme.colors.auraGoldLight)}
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // ── SECONDARY (frosted glass with border glow) ─────────────────────────
  if (variant === 'secondary') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, widthStyle, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={() => animate(0.97)}
          onPressOut={() => animate(1)}
          disabled={inactive}
          {...a11y}
          style={[styles.secondaryWrap, theme.shadow.soft, baseDisabled]}
        >
          <LinearGradient
            colors={theme.gradients.glass as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.secondaryFill, { paddingVertical: pad.v, paddingHorizontal: pad.h }]}
          >
            {content(theme.colors.softWhite)}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // ── DANGER ─────────────────────────────────────────────────────────────
  if (variant === 'danger') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, widthStyle, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={() => animate(0.97)}
          onPressOut={() => animate(1)}
          disabled={inactive}
          {...a11y}
          style={[styles.dangerWrap, theme.shadow.glowDanger, baseDisabled]}
        >
          <View style={[styles.dangerInner, { paddingVertical: pad.v, paddingHorizontal: pad.h }]}>
            {content(theme.colors.softWhite)}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // ── GHOST (hairline outlined) ──────────────────────────────────────────
  if (variant === 'ghost') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, widthStyle, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={() => animate(0.97)}
          onPressOut={() => animate(1)}
          disabled={inactive}
          {...a11y}
          style={[styles.ghost, { paddingVertical: pad.v, paddingHorizontal: pad.h }, baseDisabled]}
        >
          {content(theme.colors.softWhite)}
        </Pressable>
      </Animated.View>
    );
  }

  // ── SUBTLE (text-only) ─────────────────────────────────────────────────
  return (
    <Pressable
      onPress={handlePress}
      disabled={inactive}
      {...a11y}
      style={[styles.subtle, { paddingVertical: pad.v, paddingHorizontal: pad.h }, widthStyle, baseDisabled, style]}
    >
      {content(theme.colors.mute)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBase: {
    fontWeight: '600',
    letterSpacing: 0.6,
    textAlign: 'center',
  },

  // PRIMARY — obsidian face inside a hairline gold-gradient border
  primaryWrap: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    minHeight: 52,
  },
  primaryBorder: {
    padding: 1.2,
    borderRadius: theme.radius.pill,
  },
  primaryFace: {
    backgroundColor: 'rgba(10,8,14,0.92)',
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SECONDARY (frosted glass)
  secondaryWrap: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairlineStrong,
    minHeight: 48,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  secondaryFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // DANGER
  dangerWrap: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(229,89,78,0.45)',
    minHeight: 48,
    backgroundColor: 'rgba(229,89,78,0.10)',
  },
  dangerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // GHOST
  ghost: {
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.015)',
    minHeight: 44,
  },

  // SUBTLE
  subtle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },

  disabled: { opacity: 0.45 },
});
