import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { auraColourHex, theme, type AuraColourKey } from '@/constants/theme';

interface Props {
  size?: number;
  colour?: AuraColourKey;
  secondary?: AuraColourKey;
  intensity?: number; // 0..1
}

export function AuraOrb({ size = 260, colour = 'Violet', secondary = 'Blue', intensity = 1 }: Props) {
  const drift = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [drift, pulse]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-12, 12]) },
      { translateY: interpolate(drift.value, [0, 1], [10, -10]) },
      { scale: interpolate(pulse.value, [0, 1], [0.94, 1.04]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.85, 1]) * intensity,
  }));

  const primary = auraColourHex[colour];
  const sec = auraColourHex[secondary];

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { width: size, height: size }]}
    >
      <Animated.View style={aStyle}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="core" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={primary} stopOpacity="0.95" />
              <Stop offset="45%" stopColor={primary} stopOpacity="0.35" />
              <Stop offset="80%" stopColor={sec} stopOpacity="0.12" />
              <Stop offset="100%" stopColor={theme.colors.obsidian} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="ring" cx="50%" cy="50%" r="50%">
              <Stop offset="78%" stopColor={sec} stopOpacity="0" />
              <Stop offset="92%" stopColor={sec} stopOpacity="0.18" />
              <Stop offset="100%" stopColor={primary} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#ring)" />
          <Circle cx={size / 2} cy={size / 2} r={size / 2.6} fill="url(#core)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
