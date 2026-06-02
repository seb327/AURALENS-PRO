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

  // ── WEB · LIQUID GLASS (every variant) ──────────────────────────────────
  // Real frosted glass with backdrop-filter blur + saturate so the WebGL
  // shader behind the page genuinely shows through and "reflects" off every
  // button. SVG turbulence filter adds wet-glass warping.
  if (Platform.OS === 'web' && variant !== 'subtle') {
    const variantClass =
      variant === 'primary'   ? 'auralens-liquid--gold'   :
      variant === 'secondary' ? 'auralens-liquid--silver' :
      variant === 'ghost'     ? 'auralens-liquid--ghost'  :
      variant === 'danger'    ? 'auralens-liquid--danger' :
                                'auralens-liquid--silver';
    const sizeClass =
      size === 'lg' ? 'auralens-liquid--lg' :
      size === 'sm' ? 'auralens-liquid--sm' : '';
    const showGlyph = variant === 'primary';
    return (
      <>
        <AuralensLiquidCSS />
        {React.createElement('button' as any, {
          className: `auralens-liquid ${variantClass} ${sizeClass}`,
          onClick: handlePress,
          disabled: inactive,
          'aria-label': a11y.accessibilityLabel,
          'aria-disabled': inactive,
          style: {
            width: fullWidth ? '100%' : 'auto',
          },
        },
          React.createElement('span', { className: 'auralens-liquid__face' },
            showGlyph ? React.createElement('span', { className: 'auralens-liquid__glyph', 'aria-hidden': true }, '✦') : null,
            React.createElement('span', { className: 'auralens-liquid__label' },
              loading ? '…' : label,
            ),
          ),
        )}
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
const AURALENS_STARDUST_CSS_INERT = `
.auralens-stardust {
  -webkit-tap-highlight-color: transparent;
}
.auralens-stardust__shell {
  /* CSS variables defaulted here, overridden per modifier */
  --bg: #0b0810;
  --ink: rgba(251, 227, 162, 0.96);
  --hi: rgba(255, 235, 200, 0.30);
  --core: rgba(244, 199, 107, 0.45);
  --hi-hover: rgba(255, 235, 200, 0.42);
  --core-hover: rgba(244, 199, 107, 0.65);
  --halo: rgba(244, 199, 107, 0.16);
  --halo-hover: rgba(244, 199, 107, 0.22);
  --top-grad-1: rgba(244, 199, 107, 0.32);
  display: inline-block;
  position: relative;
  border-radius: 999px;
  background-color: var(--bg);
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  box-shadow:
    inset 0 0.35rem 0.9rem var(--hi),
    inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.70),
    inset 0 -0.45rem 0.9rem var(--core),
    0 2.4rem 2.6rem rgba(0, 0, 0, 0.35),
    0 0.9rem 1rem -0.6rem rgba(0, 0, 0, 0.80);
}

/* Gold (primary) — default tokens above already match */

/* Silver / cool (secondary) */
.auralens-stardust--silver .auralens-stardust__shell {
  --bg: #0a0a14;
  --ink: rgba(247, 243, 234, 0.95);
  --hi: rgba(255, 255, 255, 0.20);
  --core: rgba(155, 108, 255, 0.32);
  --hi-hover: rgba(255, 255, 255, 0.32);
  --core-hover: rgba(155, 108, 255, 0.50);
  --halo: rgba(155, 108, 255, 0.16);
  --halo-hover: rgba(155, 108, 255, 0.24);
  --top-grad-1: rgba(255, 255, 255, 0.22);
}

/* Ghost — quieter, less depth */
.auralens-stardust--ghost .auralens-stardust__shell {
  --bg: rgba(10, 10, 16, 0.55);
  --ink: rgba(247, 243, 234, 0.85);
  --hi: rgba(255, 255, 255, 0.10);
  --core: rgba(155, 108, 255, 0.16);
  --hi-hover: rgba(255, 255, 255, 0.20);
  --core-hover: rgba(155, 108, 255, 0.28);
  --halo: rgba(255, 255, 255, 0.06);
  --halo-hover: rgba(255, 255, 255, 0.12);
  --top-grad-1: rgba(255, 255, 255, 0.12);
}
.auralens-stardust--ghost .auralens-stardust__shell {
  box-shadow:
    inset 0 0.20rem 0.6rem var(--hi),
    inset 0 -0.45rem 0.9rem var(--core),
    0 1.4rem 1.6rem rgba(0, 0, 0, 0.30),
    0 0.5rem 0.6rem -0.4rem rgba(0, 0, 0, 0.55);
}

/* Danger */
.auralens-stardust--danger .auralens-stardust__shell {
  --bg: #1a0a0a;
  --ink: rgba(255, 220, 215, 0.96);
  --hi: rgba(255, 220, 215, 0.30);
  --core: rgba(229, 89, 78, 0.55);
  --hi-hover: rgba(255, 220, 215, 0.42);
  --core-hover: rgba(229, 89, 78, 0.75);
  --halo: rgba(229, 89, 78, 0.16);
  --halo-hover: rgba(229, 89, 78, 0.24);
  --top-grad-1: rgba(229, 89, 78, 0.32);
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
  background-color: var(--halo);
  filter: blur(2px);
}
.auralens-stardust__wrap::after {
  left: 7%; right: 7%;
  top: 14%; bottom: 40%;
  border-radius: 22px 22px 0 0;
  box-shadow: inset 0 10px 8px -10px var(--hi);
  background: linear-gradient(
    180deg,
    var(--top-grad-1) 0%,
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
    inset 0 0.35rem 0.6rem var(--hi-hover),
    inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.70),
    inset 0 -0.5rem 1.1rem var(--core-hover),
    0 2.4rem 2.6rem rgba(0, 0, 0, 0.35),
    0 0.9rem 1rem -0.6rem rgba(0, 0, 0, 0.80);
}
.auralens-stardust:hover .auralens-stardust__wrap::before {
  transform: translateY(-6%);
  background-color: var(--halo-hover);
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

// ─── Liquid glass CSS (web-only) ────────────────────────────────────────
// Real frosted glass treatment using backdrop-filter so the plasma shader
// BEHIND the page genuinely shows through and "reflects" off every button.
// Plus an SVG turbulence/displacement filter for the wet-glass distortion.
// EXACT match to the user-supplied LiquidButton reference. Dark-mode
// shadows + #container-glass filter + scale 70 displacement. Variant
// tints layered on top via CSS variables.
const AURALENS_LIQUID_CSS = `
.auralens-liquid {
  -webkit-tap-highlight-color: transparent;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  outline: none;
  background: transparent;
  border-radius: 999px;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font: inherit;
  z-index: 1;
  /* Outer "liquidbuttonVariants" base — scale on hover, transition. */
  transition: transform 300ms ease;
}
.auralens-liquid:hover { transform: scale(1.05); }

/* === EXACT shadow stack from reference (dark mode) ===================== */
.auralens-liquid__face {
  --ink: rgba(247, 243, 234, 0.95);
  --tint: transparent;
  --tint-hover: rgba(255, 255, 255, 0.05);
  --glow: rgba(0, 0, 0, 0.15);

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 999px;
  padding: 18px 38px;
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600;
  letter-spacing: 0.2px;
  white-space: nowrap;
  background: var(--tint);
  isolation: isolate;
  transition: background-color 280ms ease, box-shadow 280ms ease;
  /* EXACT reference: 0 0 8px rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.08),
     inset 3px 3px 0.5px -3.5px rgba(255,255,255,0.09),
     inset -3px -3px 0.5px -3.5px rgba(255,255,255,0.85),
     inset 1px 1px 1px -0.5px rgba(255,255,255,0.6),
     inset -1px -1px 1px -0.5px rgba(255,255,255,0.6),
     inset 0 0 6px 6px rgba(255,255,255,0.12),
     inset 0 0 2px 2px rgba(255,255,255,0.06),
     0 0 12px var(--glow); */
  box-shadow:
    0 0 8px rgba(0, 0, 0, 0.03),
    0 2px 6px rgba(0, 0, 0, 0.08),
    inset 3px 3px 0.5px -3.5px rgba(255, 255, 255, 0.09),
    inset -3px -3px 0.5px -3.5px rgba(255, 255, 255, 0.85),
    inset 1px 1px 1px -0.5px rgba(255, 255, 255, 0.60),
    inset -1px -1px 1px -0.5px rgba(255, 255, 255, 0.60),
    inset 0 0 6px 6px rgba(255, 255, 255, 0.12),
    inset 0 0 2px 2px rgba(255, 255, 255, 0.06),
    0 0 12px var(--glow);
}
/* Inner displacement layer — references the EXACT filter id from spec */
.auralens-liquid__face::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
  backdrop-filter: url(#container-glass);
  -webkit-backdrop-filter: url(#container-glass);
}
/* Top specular sheen */
.auralens-liquid__face::after {
  content: "";
  position: absolute;
  left: 8%;
  right: 8%;
  top: 8%;
  height: 36%;
  border-radius: 999px 999px 0 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.28) 0%,
    rgba(255, 255, 255, 0.05) 60%,
    rgba(255, 255, 255, 0) 100%
  );
  filter: blur(0.6px);
  z-index: 1;
}
.auralens-liquid__label {
  position: relative;
  z-index: 2;
}
.auralens-liquid__glyph {
  position: relative;
  z-index: 2;
  display: inline-block;
  font-size: 0.85em;
  opacity: 0.85;
  transition: transform 0.4s ease, opacity 0.4s ease;
}
.auralens-liquid:hover .auralens-liquid__face {
  background: var(--tint-hover);
  transform: translateY(-2px);
}
.auralens-liquid:hover .auralens-liquid__glyph {
  transform: rotate(60deg) scale(1.12);
  opacity: 1;
}
.auralens-liquid:active .auralens-liquid__face {
  transform: translateY(1px) scale(0.985);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.10),
    0 4px 10px -4px rgba(0, 0, 0, 0.55),
    inset 3px 3px 1px -2px rgba(255, 255, 255, 0.40),
    inset -3px -3px 1px -2px rgba(255, 255, 255, 0.30),
    inset 0 0 4px 3px rgba(255, 255, 255, 0.06),
    0 0 14px var(--glow);
}
.auralens-liquid:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Variant tints ─────────────────────────────────────────────────── */
.auralens-liquid--gold .auralens-liquid__face {
  --ink: #FFE8B0;
  --tint: rgba(244, 199, 107, 0.12);
  --tint-hover: rgba(244, 199, 107, 0.22);
  --glow: rgba(244, 199, 107, 0.45);
}
.auralens-liquid--silver .auralens-liquid__face {
  --ink: rgba(247, 243, 234, 0.95);
  --tint: rgba(255, 255, 255, 0.06);
  --tint-hover: rgba(255, 255, 255, 0.12);
  --glow: rgba(155, 108, 255, 0.30);
}
.auralens-liquid--ghost .auralens-liquid__face {
  --ink: rgba(247, 243, 234, 0.82);
  --tint: rgba(255, 255, 255, 0.03);
  --tint-hover: rgba(255, 255, 255, 0.08);
  --glow: rgba(255, 255, 255, 0.10);
  --inner-1: rgba(255, 255, 255, 0.18);
  --inner-2: rgba(255, 255, 255, 0.10);
  padding: 14px 30px;
}
.auralens-liquid--danger .auralens-liquid__face {
  --ink: rgba(255, 220, 215, 0.95);
  --tint: rgba(229, 89, 78, 0.16);
  --tint-hover: rgba(229, 89, 78, 0.26);
  --glow: rgba(229, 89, 78, 0.45);
}

/* Sizes */
.auralens-liquid--sm .auralens-liquid__face { padding: 10px 22px; font-size: 13px; }
.auralens-liquid--lg .auralens-liquid__face { padding: 20px 42px; font-size: 17px; }
`;

// SVG turbulence + displacement filter, attached once to the DOM. The
// filter creates the wet-glass warping referenced by backdrop-filter:
// url(#auralens-glass-filter).
// EXACT filter from reference: id="container-glass", baseFrequency="0.05 0.05",
// numOctaves=1, seed=1, displacement scale=70, final blur stdDeviation=4.
const AURALENS_GLASS_SVG = `
<svg style="position:fixed;width:0;height:0;pointer-events:none" aria-hidden="true">
  <defs>
    <filter id="container-glass" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
      <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
      <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
      <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
      <feComposite in="finalBlur" in2="finalBlur" operator="over" />
    </filter>
  </defs>
</svg>
`;

let _liquidInjected = false;
function AuralensLiquidCSS(): any {
  if (Platform.OS !== 'web') return null;
  if (typeof document !== 'undefined' && !_liquidInjected) {
    if (!document.getElementById('auralens-liquid-css')) {
      const s = document.createElement('style');
      s.id = 'auralens-liquid-css';
      s.textContent = AURALENS_LIQUID_CSS;
      document.head.appendChild(s);
    }
    if (!document.getElementById('auralens-glass-svg')) {
      const div = document.createElement('div');
      div.id = 'auralens-glass-svg';
      div.innerHTML = AURALENS_GLASS_SVG;
      document.body.appendChild(div);
    }
    _liquidInjected = true;
  }
  return null;
}
