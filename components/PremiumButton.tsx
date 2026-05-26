import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'subtle';
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];

  /** Override the screen-reader label. Defaults to `label` (strips leading symbols like "← "). */
  accessibilityLabel?: string;
  /** One-sentence hint a screen reader speaks after the label. */
  accessibilityHint?: string;
  /** Defaults to `button`. Use `link` for back navigation, `imagebutton` for icon-only. */
  accessibilityRole?: 'button' | 'link' | 'imagebutton';
  /** Test id for integration tests (Appium / Detox / Maestro). */
  testID?: string;
}

// Strip ornamental glyphs like "← ", "✕ ", "✦ " so the screen reader doesn't
// announce "left pointing arrow Back" — it just says "Back".
function cleanLabel(raw: string): string {
  return raw.replace(/^[^\p{L}\p{N}]+/u, '').trim() || raw;
}

export function PremiumButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
}: Props) {
  const handle = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const a11y = {
    accessible: true,
    accessibilityLabel: accessibilityLabel ?? cleanLabel(label),
    accessibilityHint,
    accessibilityRole,
    accessibilityState: { disabled: !!disabled },
    testID,
    // 44×44 minimum hit target (Apple HIG)
    hitSlop: { top: 8, bottom: 8, left: 8, right: 8 } as const,
  };

  // Dynamic-type tolerance: the label text scales with the OS setting but
  // capped so a luxury button doesn't break the layout at the largest sizes.
  const maxScale = 1.3;

  if (variant === 'ghost') {
    return (
      <Pressable onPress={handle} disabled={disabled} {...a11y}
        style={[styles.ghost, disabled && styles.disabled, style]}>
        <Text style={styles.ghostLabel} maxFontSizeMultiplier={maxScale} allowFontScaling>
          {label}
        </Text>
      </Pressable>
    );
  }

  if (variant === 'subtle') {
    return (
      <Pressable onPress={handle} disabled={disabled} {...a11y}
        style={[styles.subtle, disabled && styles.disabled, style]}>
        <Text style={styles.subtleLabel} maxFontSizeMultiplier={maxScale} allowFontScaling>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handle} disabled={disabled} {...a11y}
      style={[styles.primaryWrap, disabled && styles.disabled, style]}>
      <LinearGradient
        colors={['#FBE3A2', '#F4C76B', '#C99645']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryGradient}
      >
        <View style={styles.primaryInner}>
          <Text style={styles.primaryLabel} maxFontSizeMultiplier={maxScale} allowFontScaling>
            {label}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryWrap: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    shadowColor: theme.colors.auraGold,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    minHeight: 44, // ensure hit target on small devices
  },
  primaryGradient: {
    padding: 1.4,
    borderRadius: theme.radius.pill,
  },
  primaryInner: {
    backgroundColor: '#1A1305',
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#FBE3A2',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  ghost: {
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    minHeight: 44,
  },
  ghostLabel: {
    color: theme.colors.softWhite,
    fontSize: 15,
    letterSpacing: 0.4,
  },
  subtle: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  subtleLabel: {
    color: theme.colors.mute,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  disabled: { opacity: 0.4 },
});
