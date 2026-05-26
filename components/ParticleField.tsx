import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { mulberry32 } from '@/engine/scoring';

interface Particle {
  x: number;
  y: number;
  r: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
  baseOpacity: number;
}

function Dot({ p }: { p: Particle }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      p.delay,
      withRepeat(
        withTiming(1, { duration: p.duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [p.delay, p.duration, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, p.driftX]) },
      { translateY: interpolate(t.value, [0, 1], [0, p.driftY]) },
      { scale: interpolate(t.value, [0, 0.5, 1], [0.6, 1, 0.7]) },
    ],
    opacity: interpolate(t.value, [0, 0.5, 1], [0, p.baseOpacity, 0]),
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: p.x,
          top: p.y,
          width: p.r * 2,
          height: p.r * 2,
          borderRadius: p.r,
        },
        style,
      ]}
    />
  );
}

interface Props {
  count?: number;
  seed?: number;
}

export function ParticleField({ count = 28, seed = 7 }: Props) {
  const { width, height } = useWindowDimensions();

  const particles = useMemo<Particle[]>(() => {
    const rng = mulberry32(seed);
    return Array.from({ length: count }).map(() => ({
      x: rng() * width,
      y: rng() * height,
      r: 0.6 + rng() * 1.8,
      delay: rng() * 5000,
      duration: 5000 + rng() * 6000,
      driftX: (rng() - 0.5) * 80,
      driftY: (rng() - 0.5) * 80,
      baseOpacity: 0.18 + rng() * 0.5,
    }));
  }, [count, height, seed, width]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {particles.map((p, i) => (
        <Dot key={i} p={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    backgroundColor: '#F7F3EA',
    shadowColor: '#F7F3EA',
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
});
