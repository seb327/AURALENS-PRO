// Hero scan experience — bounded glass scanner frame. Every visual element
// (corners, status header, rings, scan line, micro labels, foot row) is
// positioned INSIDE the frame. The outer wrapper has overflow: hidden so no
// child can ever cross into the headline column.

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
import { theme } from '@/constants/theme';

const FRAME_W = 400;
const FRAME_H = 520;

export function HeroScanExperience() {
  const breath = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 3800, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(breath, { toValue: 0, duration: 3800, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
    Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scan, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
  }, [breath, sweep, scan, pulse]);

  const ringScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });
  const ringOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  const sweepRot = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [44, FRAME_H - 80] });
  const dotOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={styles.outer}>
      {/* Ambient violet & gold blobs — sit BEHIND the frame, but constrained by outer overflow */}
      <View pointerEvents="none" style={[styles.blob, styles.blobViolet]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobGold]} />

      <View style={styles.frame}>
        <LinearGradient
          colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.015)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Corner brackets */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Status header */}
        <View style={styles.header}>
          <Animated.View style={[styles.statusDot, { opacity: dotOp }]} />
          <Text style={styles.headerText}>READING ENGINE · ACTIVE</Text>
        </View>

        {/* Centre stage */}
        <View style={styles.stage} pointerEvents="none">
          {[1.0, 1.32, 1.7].map((m, i) => (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width: 170 * m,
                  height: 170 * m,
                  borderColor:
                    i === 0 ? 'rgba(244,199,107,0.62)' :
                    i === 1 ? 'rgba(155,108,255,0.36)' :
                              'rgba(91,91,214,0.22)',
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
          ))}

          <Animated.View style={[styles.sweepHost, { transform: [{ rotate: sweepRot }] }]}>
            <View style={styles.sweepDot} />
          </Animated.View>

          {/* Face landmark map — bounded 160×160 */}
          <View style={styles.face}>
            <View style={[styles.lm, { top: 28, left: 50 }]} />
            <View style={[styles.lm, { top: 28, right: 50 }]} />
            <View style={[styles.lm, { top: 48, left: 64 }]} />
            <View style={[styles.lm, { top: 48, right: 64 }]} />
            <View style={[styles.lm, { top: 80, left: '50%', marginLeft: -3 }]} />
            <View style={[styles.lm, { top: 108, left: '50%', marginLeft: -3 }]} />
            <View style={[styles.lmSoft, { top: 132, left: 48 }]} />
            <View style={[styles.lmSoft, { top: 132, right: 48 }]} />
            <View style={[styles.gridLine, { top: 33, left: 52, width: 56 }]} />
            <View style={[styles.gridLine, { top: 33, right: 52, width: 56 }]} />
            <View style={[styles.gridLine, { top: 104, left: 50, width: 60 }]} />
          </View>

          {/* Vertical scan line — bounded inside stage */}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}>
            <LinearGradient
              colors={['rgba(244,199,107,0)', 'rgba(244,199,107,0.85)', 'rgba(244,199,107,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Foot row INSIDE frame, position absolute bottom */}
        <View style={styles.foot}>
          <View style={styles.footPill}><Text style={styles.footPillText}>76</Text></View>
          <Text style={styles.footLabel}>AURA SIGNAL</Text>
          <View style={styles.flex} />
          <Text style={styles.footLabel}>PRIVATE</Text>
        </View>

        {/* Inline micro-labels — INSIDE the frame, at safe corners */}
        <View style={[styles.tag, styles.tagTopRight]}>
          <View style={styles.tagDot} />
          <Text style={styles.tagText}>Visual energy profile</Text>
        </View>
        <View style={[styles.tag, styles.tagMidLeft]}>
          <View style={styles.tagDot} />
          <Text style={styles.tagText}>Symbolic face map</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: FRAME_W + 40,
    height: FRAME_H + 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  blob: {
    position: 'absolute',
    borderRadius: 999,
    // @ts-expect-error web-only blur for ambient bloom
    filter: 'blur(80px)',
  },
  blobViolet: {
    width: 320, height: 320,
    backgroundColor: 'rgba(155,108,255,0.28)',
    top: -10, left: -20,
  },
  blobGold: {
    width: 220, height: 220,
    backgroundColor: 'rgba(244,199,107,0.20)',
    bottom: -20, right: -20,
  },

  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.24)',
    backgroundColor: 'rgba(8,8,14,0.74)',
    overflow: 'hidden',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 30 },
    elevation: 18,
  },

  corner: {
    position: 'absolute', width: 22, height: 22,
    borderColor: theme.colors.auraGold,
  },
  cornerTL: { top: 14, left: 14, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 },
  cornerTR: { top: 14, right: 14, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 },
  cornerBL: { bottom: 14, left: 14, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 14, right: 14, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  statusDot: {
    width: 7, height: 7, borderRadius: 7,
    backgroundColor: theme.colors.auraGold,
    shadowColor: theme.colors.auraGold,
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  headerText: {
    color: theme.colors.auraGold,
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '600',
    fontFamily: theme.font.body,
  },

  stage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sweepHost: {
    position: 'absolute',
    width: 290, height: 290,
    alignItems: 'center',
  },
  sweepDot: {
    position: 'absolute',
    top: -3,
    width: 6, height: 6, borderRadius: 6,
    backgroundColor: theme.colors.auraGold,
    shadowColor: theme.colors.auraGold,
    shadowOpacity: 0.95,
    shadowRadius: 10,
  },
  face: {
    width: 160, height: 160,
    position: 'relative',
  },
  lm: {
    position: 'absolute',
    width: 6, height: 6, borderRadius: 6,
    backgroundColor: theme.colors.auraGoldLight,
    shadowColor: theme.colors.auraGold,
    shadowOpacity: 1, shadowRadius: 6,
  },
  lmSoft: {
    position: 'absolute',
    width: 5, height: 5, borderRadius: 5,
    backgroundColor: 'rgba(155,108,255,0.85)',
    shadowColor: '#9B6CFF',
    shadowOpacity: 0.95, shadowRadius: 6,
  },
  gridLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(244,199,107,0.28)',
  },
  scanLine: {
    position: 'absolute',
    left: 16, right: 16,
    height: 2,
    borderRadius: 2,
  },

  foot: {
    position: 'absolute',
    left: 20, right: 20, bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.5)',
    backgroundColor: 'rgba(244,199,107,0.08)',
  },
  footPillText: {
    color: theme.colors.auraGoldLight,
    fontFamily: theme.font.mono,
    fontSize: 12,
    fontWeight: '500',
  },
  footLabel: {
    color: theme.colors.dim,
    fontSize: 9,
    letterSpacing: 1.8,
    fontFamily: theme.font.body,
  },
  flex: { flex: 1 },

  // Inline tags — sit just inside the frame, never outside
  tag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(8,8,14,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.20)',
  },
  tagDot: {
    width: 4, height: 4, borderRadius: 4,
    backgroundColor: theme.colors.auraGold,
  },
  tagText: {
    color: theme.colors.softWhite,
    fontSize: 10,
    letterSpacing: 0.5,
    fontFamily: theme.font.body,
  },
  tagTopRight: { top: 70, right: 18 },
  tagMidLeft:  { top: '46%', left: 18 },
});
