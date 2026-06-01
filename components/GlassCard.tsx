import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  strong?: boolean;
  glow?: boolean;          // when true, adds a subtle gold inner glow line
  padding?: number;
}

/**
 * Premium frosted-glass surface. Use for grouping content with depth and
 * separation from the background. Pass `glow` to highlight monthly /
 * recommended / "do this" cards on the pricing & result screens.
 */
export function GlassCard({
  children,
  style,
  intensity = 30,
  strong,
  glow,
  padding = theme.spacing.lg,
}: Props) {
  return (
    <View style={[styles.wrap, glow && styles.wrapGlow, glow && theme.shadow.glowGold, !glow && theme.shadow.soft, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={(strong ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { padding }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  wrapGlow: {
    borderColor: 'rgba(244,199,107,0.30)',
  },
  content: { position: 'relative' },
});
