// Hero preview card — a glass-panel mockup of a reading shown on the
// right column of the home hero on wide viewports. Sets a quality
// expectation before the user has even tapped Start.
//
// All the numbers are intentionally aspirational sample data, NOT a real
// reading — this is product marketing surface, the kind of mockup
// Linear / Vercel / Stripe use on their landing pages.

import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuraOrb } from './AuraOrb';
import { theme } from '@/constants/theme';

const PREVIEW_METRICS = [
  { label: 'Energy clarity',  value: 84 },
  { label: 'Emotional flow',  value: 71 },
  { label: 'Inner balance',   value: 68 },
  { label: 'Outer presence',  value: 79 },
];

export function HeroPreview() {
  // Subtle ambient "live" breathing on the preview orb so the card
  // doesn't feel static. Slower than the processing screen ring.
  const breath = useRef(new Animated.Value(0)).current;
  // Sequential metric-bar fill on mount — feels like a tiny preview
  // reading is happening as you arrive.
  const fills = useRef(PREVIEW_METRICS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(breath, {
          toValue: 0, duration: 3200, easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ).start();

    Animated.stagger(
      180,
      fills.map((v, i) =>
        Animated.timing(v, {
          toValue: PREVIEW_METRICS[i].value / 100,
          duration: 1100,
          delay: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [breath, fills]);

  const orbScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] });
  const orbOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']}
          style={StyleSheet.absoluteFill}
        />
        {/* Spec sheet header — tier + score */}
        <View style={styles.header}>
          <View style={styles.dot} />
          <Text style={styles.eyebrow}>LIVE AURA SAMPLE</Text>
        </View>

        <View style={styles.heroRow}>
          <Animated.View
            style={[
              styles.orbSlot,
              { transform: [{ scale: orbScale }], opacity: orbOpacity },
            ]}
          >
            <AuraOrb size={150} colour="Violet" secondary="Gold" intensity={0.9} />
          </Animated.View>

          <View style={styles.tierBlock}>
            <Text style={styles.tierLabel}>Rising</Text>
            <Text style={styles.tierScore}>76<Text style={styles.tierScoreSmall}>/100</Text></Text>
            <Text style={styles.tierBody}>
              Violet dominant · gold undertone
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metrics}>
          {PREVIEW_METRICS.map((m, i) => {
            const widthInterp = fills[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            });
            return (
              <View key={m.label} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <View style={styles.barBg}>
                  <Animated.View style={[styles.barFill, { width: widthInterp }]}>
                    <LinearGradient
                      colors={['#FBE3A2', '#F4C76B']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>
                <Text style={styles.metricValue}>{m.value}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footRow}>
          <Text style={styles.footMicro}>Sample preview — your reading personalises in seconds.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 460,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.22)',
    backgroundColor: 'rgba(10,10,16,0.55)',
    padding: 22,
    overflow: 'hidden',
    shadowColor: theme.colors.auraGold,
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: theme.colors.auraGold,
    shadowColor: theme.colors.auraGold,
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  eyebrow: {
    color: theme.colors.auraGold,
    fontSize: 10,
    letterSpacing: 2.6,
    fontWeight: '600',
    fontFamily: theme.font.body,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  orbSlot: {
    width: 150, height: 150,
    alignItems: 'center', justifyContent: 'center',
  },
  tierBlock: { flex: 1 },
  tierLabel: {
    color: theme.colors.softWhite,
    fontFamily: theme.font.display,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '300',
    letterSpacing: -0.4,
  },
  tierScore: {
    color: theme.colors.auraGoldLight,
    fontFamily: theme.font.display,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '300',
    marginTop: 2,
  },
  tierScoreSmall: { fontSize: 18, color: theme.colors.mute },
  tierBody: {
    color: theme.colors.mute,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontFamily: theme.font.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.hairline,
    marginVertical: 18,
  },
  metrics: { gap: 12 },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricLabel: {
    color: theme.colors.mute,
    fontFamily: theme.font.body,
    fontSize: 12,
    width: 120,
  },
  barBg: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  metricValue: {
    color: theme.colors.softWhite,
    fontFamily: theme.font.mono,
    fontSize: 11,
    width: 28,
    textAlign: 'right',
  },
  footRow: { marginTop: 18 },
  footMicro: {
    color: theme.colors.dim,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 0.3,
    fontFamily: theme.font.body,
    textAlign: 'center',
  },
});
