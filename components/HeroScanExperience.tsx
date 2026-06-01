// Hero scan experience — replaces the previous "dashboard widget" preview
// with a real cinematic product moment. A glass scanner device frame
// containing a face landmark grid, three concentric breathing aura rings,
// a vertical scan line, four floating micro labels, and ambient violet/
// gold light blobs behind the frame.
//
// All web-safe: uses Animated for motion (native driver where supported)
// and pure StyleSheet for layout. No new dependencies.

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

const FRAME_W = 380;
const FRAME_H = 480;

export function HeroScanExperience() {
  const breath = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const labelPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Breathing rings — 4s in/out
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 3800, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(breath, { toValue: 0, duration: 3800, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
    // Sweep dot — full rotation every 6s
    Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }),
    ).start();
    // Vertical scan line — down then back up
    Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(scan, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
    // Label pulse — synced status dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(labelPulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(labelPulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
  }, [breath, sweep, scan, labelPulse]);

  const ringScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });
  const ringOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  const sweepRot = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [44, FRAME_H - 60] });
  const labelDotOp = labelPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={styles.outerSlot}>
      {/* Ambient violet glow blob behind frame */}
      <View pointerEvents="none" style={[styles.glowBlob, styles.glowViolet]} />
      {/* Ambient gold glow blob */}
      <View pointerEvents="none" style={[styles.glowBlob, styles.glowGold]} />

      {/* The scanner device frame */}
      <View style={styles.frame}>
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Corner brackets */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Top label */}
        <View style={styles.frameLabel}>
          <Animated.View style={[styles.statusDot, { opacity: labelDotOp }]} />
          <Text style={styles.frameLabelText}>READING ENGINE · ACTIVE</Text>
        </View>

        {/* Centre stage with face silhouette + rings */}
        <View style={styles.centreStage} pointerEvents="none">
          {/* Three concentric rings */}
          {[1.0, 1.32, 1.72].map((m, i) => (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width: 180 * m,
                  height: 180 * m,
                  borderColor:
                    i === 0 ? 'rgba(244,199,107,0.65)' :
                    i === 1 ? 'rgba(155,108,255,0.40)' :
                              'rgba(91,91,214,0.25)',
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
          ))}

          {/* Rotating gold sweep dot on outer ring */}
          <Animated.View style={[styles.sweepHost, { transform: [{ rotate: sweepRot }] }]}>
            <View style={styles.sweepDot} />
          </Animated.View>

          {/* Face silhouette — abstract landmark grid */}
          <View style={styles.face}>
            {/* Forehead, brow, eyes, nose, mouth — represented as glowing dots */}
            <View style={[styles.landmark, { top: 22, left: 60 }]} />
            <View style={[styles.landmark, { top: 22, right: 60 }]} />
            <View style={[styles.landmark, { top: 46, left: 76 }]} />
            <View style={[styles.landmark, { top: 46, right: 76 }]} />
            <View style={[styles.landmark, { top: 80, left: '50%', marginLeft: -3 }]} />
            <View style={[styles.landmark, { top: 110, left: '50%', marginLeft: -3 }]} />
            {/* Mouth */}
            <View style={[styles.landmarkSoft, { top: 140, left: 56 }]} />
            <View style={[styles.landmarkSoft, { top: 140, right: 56 }]} />

            {/* Connecting lines — subtle hairlines */}
            <View style={[styles.gridLine, { top: 33, left: 60, width: 100 }]} />
            <View style={[styles.gridLine, { top: 113, left: 56, width: 108 }]} />
          </View>

          {/* Vertical scan line crossing the face */}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY }] }]}>
            <LinearGradient
              colors={['rgba(244,199,107,0)', 'rgba(244,199,107,0.85)', 'rgba(244,199,107,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Bottom status row */}
        <View style={styles.frameFoot}>
          <View style={styles.footPill}><Text style={styles.footPillText}>76</Text></View>
          <Text style={styles.footLabel}>AURA SIGNAL</Text>
          <View style={styles.spacer} />
          <Text style={styles.footLabel}>PRIVATE</Text>
        </View>
      </View>

      {/* Floating micro-labels around the frame */}
      <View style={[styles.microLabel, styles.microTopRight]}>
        <View style={styles.microDot} />
        <Text style={styles.microText}>Symbolic face map</Text>
      </View>
      <View style={[styles.microLabel, styles.microLeftMid]}>
        <View style={styles.microDot} />
        <Text style={styles.microText}>Visual energy profile</Text>
      </View>
      <View style={[styles.microLabel, styles.microRightBot]}>
        <View style={styles.microDot} />
        <Text style={styles.microText}>Private reflection</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerSlot: {
    width: FRAME_W + 80,
    height: FRAME_H + 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowBlob: {
    position: 'absolute',
    borderRadius: 999,
    // @ts-expect-error web-only blur for the ambient bloom behind the frame
    filter: 'blur(80px)',
  },
  glowViolet: {
    width: 340,
    height: 340,
    backgroundColor: 'rgba(155,108,255,0.30)',
    top: -10,
    left: -30,
  },
  glowGold: {
    width: 240,
    height: 240,
    backgroundColor: 'rgba(244,199,107,0.22)',
    bottom: 0,
    right: -20,
  },

  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.22)',
    backgroundColor: 'rgba(8,8,14,0.72)',
    overflow: 'hidden',
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 30 },
    elevation: 18,
  },

  corner: {
    position: 'absolute',
    width: 22, height: 22,
    borderColor: theme.colors.auraGold,
  },
  cornerTL: { top: 14, left: 14, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 },
  cornerTR: { top: 14, right: 14, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 },
  cornerBL: { bottom: 14, left: 14, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 14, right: 14, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 },

  frameLabel: {
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
  frameLabelText: {
    color: theme.colors.auraGold,
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '600',
    fontFamily: theme.font.body,
  },

  centreStage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 60,
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
    width: 310, height: 310,
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
    width: 180,
    height: 180,
    position: 'relative',
  },
  landmark: {
    position: 'absolute',
    width: 6, height: 6, borderRadius: 6,
    backgroundColor: theme.colors.auraGoldLight,
    shadowColor: theme.colors.auraGold,
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  landmarkSoft: {
    position: 'absolute',
    width: 5, height: 5, borderRadius: 5,
    backgroundColor: 'rgba(155,108,255,0.85)',
    shadowColor: '#9B6CFF',
    shadowOpacity: 0.95,
    shadowRadius: 6,
  },
  gridLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(244,199,107,0.25)',
  },

  scanLine: {
    position: 'absolute',
    left: 8, right: 8,
    height: 2,
    borderRadius: 2,
  },

  frameFoot: {
    position: 'absolute',
    left: 22, right: 22, bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  spacer: { flex: 1 },

  // Floating micro-labels
  microLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8,8,14,0.85)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.22)',
  },
  microDot: {
    width: 5, height: 5, borderRadius: 5,
    backgroundColor: theme.colors.auraGold,
  },
  microText: {
    color: theme.colors.softWhite,
    fontSize: 10,
    letterSpacing: 0.6,
    fontFamily: theme.font.body,
  },
  microTopRight: { top: 6, right: 0 },
  microLeftMid:  { top: '38%', left: 0 },
  microRightBot: { bottom: 22, right: 6 },
});
