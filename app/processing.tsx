import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AuraOrb } from '@/components/AuraOrb';
import { PremiumButton } from '@/components/PremiumButton';
import { DisplayTitle, FadeUp } from '@/components/DisplayText';
import { copy } from '@/constants/copy';
import { theme } from '@/constants/theme';
import { runAuraEngineFromAnalysis } from '@/engine/auraEngine';
import { getFaceAnalyzer } from '@/services/faceAnalysisService';
import type { FaceAnalysisResult } from '@/types/faceAnalysis';
import { useReadingStore } from '@/store/useReadingStore';
import { useEntitlementStore, canStartReading } from '@/store/useEntitlementStore';
import { hapticLight, hapticPhase, hapticSuccess, pulseShaderEnergy } from '@/services/haptics';

const MIN_READING_DURATION_MS = 7500;

const PHASES = [
  'Mapping facial energy points',
  'Reading symbolic face zones',
  'Building your visual energy profile',
  'Balancing aura signal',
  'Preparing your reflection',
];

export default function Processing() {
  const params = useLocalSearchParams<{ inputType?: string; uris?: string }>();
  const setCurrent = useReadingStore((s) => s.setCurrent);
  const save = useReadingStore((s) => s.save);
  const consumeOneCredit = useEntitlementStore((s) => s.consumeOneCredit);
  const hasMonthly = useEntitlementStore((s) => s.hasMonthly);
  const readingCredits = useEntitlementStore((s) => s.readingCredits);

  const [phase, setPhase] = useState(0);
  const [errorState, setErrorState] =
    useState<{ title: string; reason: string; retryTo: string } | null>(null);

  // Scan ring animations — concentric breathing + rotating sweep
  const breath = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Soft kick-off haptic + shader bloom on mount
    hapticLight();
    pulseShaderEnergy(1.2);

    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(breath, {
          toValue: 0, duration: 2000, easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.timing(sweep, {
        toValue: 1, duration: 5500, easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ).start();
  }, [breath, sweep]);

  // Phase advancement, evenly spread across the minimum duration.
  useEffect(() => {
    const perPhase = MIN_READING_DURATION_MS / PHASES.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < PHASES.length; i++) {
      timers.push(
        setTimeout(() => {
          setPhase(i);
          hapticPhase();
          pulseShaderEnergy(0.8);
        }, i * perPhase),
      );
    }
    return () => { timers.forEach(clearTimeout); };
  }, []);

  // Run the actual engine in parallel; hold its result until the minimum
  // cinematic duration has elapsed, then transition.
  useEffect(() => {
    let cancelled = false;
    const start = performance?.now?.() ?? Date.now();

    const run = async () => {
      try {
        const inputType: 'camera' | 'upload' =
          (params.inputType as any) === 'upload' ? 'upload' : 'camera';
        const uris: string[] = params.uris ? JSON.parse(params.uris) : [];

        if (uris.length === 0) {
          setErrorState({
            title: 'No image',
            reason: 'No image was captured.',
            retryTo: inputType === 'upload' ? '/upload' : '/scan',
          });
          return;
        }

        if (!canStartReading({ hasMonthly, readingCredits })) {
          setErrorState({
            title: 'No reading available',
            reason: 'Please purchase a reading to continue.',
            retryTo: '/pricing',
          });
          return;
        }

        const analyzer = await getFaceAnalyzer();
        const results: FaceAnalysisResult[] = [];
        for (const uri of uris) {
          try { results.push(await analyzer.analyzeImage(uri)); } catch { /* skip */ }
        }

        if (results.length === 0) {
          setErrorState({
            title: 'Could not analyse',
            reason: 'We could not read any of those images. Please try again with clearer portraits.',
            retryTo: inputType === 'upload' ? '/upload' : '/scan',
          });
          return;
        }

        const best = results.reduce((a, b) =>
          a.quality.confidence >= b.quality.confidence ? a : b,
        );

        if (best.rescan || best.quality.confidence < 35) {
          setErrorState({
            title: 'Try a clearer portrait',
            reason: best.rescanReason ?? 'Image quality is too low for a reliable reading.',
            retryTo: inputType === 'upload' ? '/upload' : '/scan',
          });
          return;
        }

        const reading = runAuraEngineFromAnalysis(best, inputType);

        const consumed = await consumeOneCredit();
        if (!consumed) {
          setErrorState({
            title: 'No reading available',
            reason: 'Please purchase a reading to continue.',
            retryTo: '/pricing',
          });
          return;
        }

        // Wait out the remainder of the cinematic minimum duration
        const elapsed = (performance?.now?.() ?? Date.now()) - start;
        const remaining = Math.max(0, MIN_READING_DURATION_MS - elapsed);
        await new Promise((r) => setTimeout(r, remaining));
        if (cancelled) return;

        setCurrent(reading);
        await save(reading);
        hapticSuccess();
        pulseShaderEnergy(1.6);
        router.replace('/result');
      } catch {
        setErrorState({
          title: 'Something went wrong',
          reason: 'Please try the scan again.',
          retryTo: '/scan',
        });
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errorState) {
    return (
      <ScreenContainer orbColour="Red">
        <FadeUp>
          <DisplayTitle size="page">{errorState.title}</DisplayTitle>
        </FadeUp>
        <FadeUp delay={120}>
          <Text style={styles.errBody}>{errorState.reason}</Text>
          <Text style={styles.refund}>Your reading credit was not used.</Text>
        </FadeUp>
        <FadeUp delay={240}>
          <PremiumButton
            label="Try Again"
            onPress={() => router.replace(errorState.retryTo as any)}
            fullWidth
          />
          <View style={{ height: 8 }} />
          <PremiumButton
            label="Back to Home"
            onPress={() => router.replace('/')}
            variant="subtle"
            fullWidth
          />
        </FadeUp>
      </ScreenContainer>
    );
  }

  // Scan rings — three concentric breathing rings + rotating sweep arc
  const ringScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] });
  const ringOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  const sweepRotate = sweep.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  });

  return (
    <ScreenContainer scroll={false} particles>
      <View style={styles.center}>
        {/* Aura orb at centre, with scan rings + sweep around it */}
        <View style={styles.orbStack}>
          {[1.05, 1.4, 1.85].map((mult, i) => (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width: 240 * mult,
                  height: 240 * mult,
                  borderColor: i === 0
                    ? 'rgba(244,199,107,0.55)'
                    : 'rgba(155,108,255,0.30)',
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.sweepWrap,
              { transform: [{ rotate: sweepRotate }] },
            ]}
          >
            <View style={styles.sweepDot} />
          </Animated.View>

          <AuraOrb size={260} colour="Violet" secondary="Gold" />
        </View>

        <View style={styles.phaseBlock}>
          <Text style={styles.phaseEyebrow}>
            Step {phase + 1} of {PHASES.length}
          </Text>
          <Text
            style={styles.phaseLabel}
            accessibilityLiveRegion="polite"
            accessibilityRole="text"
            accessibilityLabel={`${PHASES[phase]}. Step ${phase + 1} of ${PHASES.length}.`}
            maxFontSizeMultiplier={1.4}
          >
            {PHASES[phase]}
          </Text>
          <View style={styles.dots} accessible={false}>
            {PHASES.map((_, i) => (
              <View key={i} style={[styles.dot, i <= phase && styles.dotActive]} />
            ))}
          </View>
        </View>
        <Text style={styles.dis} maxFontSizeMultiplier={1.4}>
          {copy.disclaimers.short}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: 40,
  },
  orbStack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 460,
    height: 460,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sweepWrap: {
    position: 'absolute',
    width: 320, height: 320,
    alignItems: 'center',
  },
  sweepDot: {
    position: 'absolute',
    top: -3,
    width: 6, height: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.auraGold,
    shadowColor: theme.colors.auraGold,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  phaseBlock: { alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  phaseEyebrow: {
    color: theme.colors.auraGold,
    fontSize: 11,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
    fontFamily: theme.font.body,
  },
  phaseLabel: {
    color: theme.colors.softWhite,
    fontFamily: theme.font.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.2,
    fontWeight: '300',
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)' },
  dotActive: { backgroundColor: theme.colors.auraGold, shadowColor: theme.colors.auraGold, shadowOpacity: 0.8, shadowRadius: 6 },
  dis: {
    color: theme.colors.dim, fontSize: 11, textAlign: 'center',
    paddingHorizontal: 32, letterSpacing: 0.4,
  },
  errBody: { color: theme.colors.mute, fontSize: 15, lineHeight: 22, marginTop: 8 },
  refund: { color: theme.colors.dim, fontSize: 12, marginTop: 12, marginBottom: 16 },
});
