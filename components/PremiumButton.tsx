import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef } from 'react';
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

  // ── PRIMARY · WEB ───────────────────────────────────────────────────────
  // Stardust-style real HTML <button> with proper inset shadows, pseudo-
  // element highlights, hover specular, and active compression. Aura gold
  // on obsidian palette. CSS lives in a one-time <style> tag (id keeps it
  // dedupable across many button instances).
  if (variant === 'primary' && Platform.OS === 'web') {
    const sizePx = size === 'lg' ? '20px 38px' : size === 'sm' ? '12px 24px' : '16px 32px';
    const fontPx = size === 'lg' ? 18 : size === 'sm' ? 13 : 15;
    return (
      <>
        <AuralensStardustCSS />
        {/* eslint-disable-next-line react/no-unknown-property */}
        {React.createElement('button' as any, {
          className: 'auralens-stardust',
          onClick: handlePress,
          disabled: inactive,
          'aria-label': a11y.accessibilityLabel,
          'aria-disabled': inactive,
          style: {
            padding: 0,
            border: 0,
            outline: 'none',
            cursor: inactive ? 'not-allowed' : 'pointer',
            background: 'transparent',
            font: 'inherit',
            opacity: inactive ? 0.45 : 1,
            width: fullWidth ? '100%' : 'auto',
            display: 'inline-block',
          },
        }, React.createElement('span', { className: 'auralens-stardust__shell' },
          React.createElement('span', { className: 'auralens-stardust__wrap' },
            React.createElement('span', { className: 'auralens-stardust__label', style: { fontSize: fontPx, padding: sizePx } },
              React.createElement('span', { className: 'auralens-stardust__glyph', 'aria-hidden': true }, '✦'),
              React.createElement('span', { className: 'auralens-stardust__glyph auralens-stardust__glyph--hover', 'aria-hidden': true }, '✧'),
              loading ? React.createElement('span', null, '…') : label,
            ),
          ),
        ))}
      </>
    );
  }

  // ── PRIMARY · NATIVE ────────────────────────────────────────────────────
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
          {/* Deep glass base */}
          <View style={styles.primaryBase} />
          {/* Subtle gold→violet tint */}
          <LinearGradient
            colors={['rgba(244,199,107,0.22)', 'rgba(201,150,69,0.10)', 'rgba(155,108,255,0.14)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Soft top inner highlight */}
          <LinearGradient
            colors={['rgba(255,235,200,0.20)', 'rgba(255,235,200,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.55 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Gold-tinted hairline border */}
          <View style={styles.primaryRing} pointerEvents="none" />
          {/* Content */}
          <View style={[styles.primaryContent, { paddingVertical: pad.v + 2, paddingHorizontal: pad.h + 4 }]}>
            {content(theme.colors.auraGoldLight)}
          </View>
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

  // PRIMARY — filled glass with layered gradient surface
  primaryWrap: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    minHeight: 56,
    position: 'relative',
  },
  primaryBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,8,14,0.92)',
  },
  primaryRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.45)',
  },
  primaryContent: {
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

// ── Stardust CSS (web-only) ────────────────────────────────────────────────
// One-time <style> injection. The selectors target a real <button> wrapper
// rendered above. Adapted from the user-supplied pearl/stardust pattern,
// recoloured to the AuraLens gold-on-obsidian palette.
const AURALENS_STARDUST_CSS = `
.auralens-stardust {
  -webkit-tap-highlight-color: transparent;
}
.auralens-stardust__shell {
  --bg: #0b0810;
  --ink: rgba(251, 227, 162, 0.96);
  display: inline-block;
  position: relative;
  border-radius: 999px;
  background-color: var(--bg);
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  box-shadow:
    inset 0 0.35rem 0.9rem rgba(255, 235, 200, 0.30),
    inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.70),
    inset 0 -0.45rem 0.9rem rgba(244, 199, 107, 0.45),
    0 2.4rem 2.6rem rgba(0, 0, 0, 0.35),
    0 0.9rem 1rem -0.6rem rgba(0, 0, 0, 0.80);
}
.auralens-stardust__wrap {
  display: block;
  position: relative;
  border-radius: inherit;
  overflow: hidden;
}
.auralens-stardust__wrap::before,
.auralens-stardust__wrap::after {
  content: "";
  position: absolute;
  transition: transform 0.35s ease, opacity 0.35s ease;
  pointer-events: none;
}
.auralens-stardust__wrap::before {
  left: -18%; right: -18%;
  bottom: 24%; top: -100%;
  border-radius: 50%;
  background-color: rgba(244, 199, 107, 0.16);
  filter: blur(2px);
}
.auralens-stardust__wrap::after {
  left: 7%; right: 7%;
  top: 14%; bottom: 40%;
  border-radius: 22px 22px 0 0;
  box-shadow: inset 0 10px 8px -10px rgba(255, 235, 200, 0.65);
  background: linear-gradient(
    180deg,
    rgba(244, 199, 107, 0.32) 0%,
    rgba(0, 0, 0, 0) 50%,
    rgba(0, 0, 0, 0) 100%
  );
}
.auralens-stardust__label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: transform 0.2s ease;
  transform: translateY(1%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(251,227,162,1) 55%, rgba(251,227,162,0.85) 100%);
          mask-image: linear-gradient(to bottom, rgba(251,227,162,1) 55%, rgba(251,227,162,0.85) 100%);
  white-space: nowrap;
}
.auralens-stardust__glyph {
  display: inline-block;
  font-size: 0.85em;
  opacity: 0.85;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.auralens-stardust__glyph--hover { display: none; }

.auralens-stardust:hover .auralens-stardust__shell {
  box-shadow:
    inset 0 0.35rem 0.6rem rgba(255, 235, 200, 0.42),
    inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.70),
    inset 0 -0.5rem 1.1rem rgba(244, 199, 107, 0.65),
    0 2.4rem 2.6rem rgba(0, 0, 0, 0.35),
    0 0.9rem 1rem -0.6rem rgba(0, 0, 0, 0.80);
}
.auralens-stardust:hover .auralens-stardust__wrap::before {
  transform: translateY(-6%);
  background-color: rgba(244, 199, 107, 0.22);
}
.auralens-stardust:hover .auralens-stardust__wrap::after {
  opacity: 0.55;
  transform: translateY(6%);
}
.auralens-stardust:hover .auralens-stardust__label {
  transform: translateY(-5%);
}
.auralens-stardust:hover .auralens-stardust__glyph { display: none; }
.auralens-stardust:hover .auralens-stardust__glyph--hover { display: inline-block; }

.auralens-stardust:active .auralens-stardust__shell {
  transform: translateY(2px);
  box-shadow:
    inset 0 0.35rem 0.5rem rgba(255, 235, 200, 0.55),
    inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.80),
    inset 0 -0.4rem 0.9rem rgba(244, 199, 107, 0.50),
    0 1.6rem 1.6rem rgba(0, 0, 0, 0.35),
    0 0.7rem 0.7rem -0.5rem rgba(0, 0, 0, 0.85);
}
`;

let _stardustInjected = false;
function AuralensStardustCSS(): any {
  if (Platform.OS !== 'web') return null;
  if (typeof document !== 'undefined' && !_stardustInjected) {
    if (!document.getElementById('auralens-stardust-css')) {
      const s = document.createElement('style');
      s.id = 'auralens-stardust-css';
      s.textContent = AURALENS_STARDUST_CSS;
      document.head.appendChild(s);
    }
    _stardustInjected = true;
  }
  return null;
}
