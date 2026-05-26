import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  strong?: boolean;
  padding?: number;
}

export function GlassCard({ children, style, intensity = 28, strong, padding = theme.spacing.lg }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.tint, strong && styles.tintStrong, { padding }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tint: { backgroundColor: theme.colors.glass },
  tintStrong: { backgroundColor: theme.colors.glassStrong },
});
