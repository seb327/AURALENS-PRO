import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AuraOrb } from '@/components/AuraOrb';
import { PremiumButton } from '@/components/PremiumButton';
import { copy } from '@/constants/copy';
import { theme } from '@/constants/theme';
import { runAuraEngineFromAnalysis } from '@/engine/auraEngine';
import { getFaceAnalyzer } from '@/services/faceAnalysisService';
import type { FaceAnalysisResult } from '@/types/faceAnalysis';
import { useReadingStore } from '@/store/useReadingStore';
import { useEntitlementStore, canStartReading } from '@/store/useEntitlementStore';

export default function Processing() {
  const params = useLocalSearchParams<{ inputType?: string; uris?: string }>();
  const setCurrent = useReadingStore((s) => s.setCurrent);
  const save = useReadingStore((s) => s.save);
  const consumeOneCredit = useEntitlementStore((s) => s.consumeOneCredit);
  const hasMonthly = useEntitlementStore((s) => s.hasMonthly);
  const readingCredits = useEntitlementStore((s) => s.readingCredits);

  const [step, setStep] = useState(0);
  const [errorState, setErrorState] = useState<{ title: string; reason: string; retryTo: string } | null>(null);

  useEffect(() => {
    const i = setInterval(() => setStep((s) => Math.min(s + 1, copy.processing.length - 1)), 800);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const inputType: 'camera' | 'upload' = (params.inputType as any) === 'upload' ? 'upload' : 'camera';
        const uris: string[] = params.uris ? JSON.parse(params.uris) : [];

        if (uris.length === 0) {
          setErrorState({ title: 'No image', reason: 'No image was captured.', retryTo: inputType === 'upload' ? '/upload' : '/scan' });
          return;
        }

        // Defensive: confirm the user still has access. If the navigation got
        // out of order they should never reach this screen, but if they do we
        // bounce them to pricing rather than burn into the credit accounting.
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
          try {
            results.push(await analyzer.analyzeImage(uri));
          } catch {
            // skip failed images
          }
        }

        if (results.length === 0) {
          setErrorState({
            title: 'Could not analyze',
            reason: 'We could not read any of those images. Please try again with clearer photos.',
            retryTo: inputType === 'upload' ? '/upload' : '/scan',
          });
          return; // credit NOT consumed
        }

        const best = results.reduce((a, b) => (a.quality.confidence >= b.quality.confidence ? a : b));

        if (best.rescan || best.quality.confidence < 35) {
          setErrorState({
            title: 'Try again',
            reason: best.rescanReason ?? 'Image quality is too low for a reliable reading.',
            retryTo: inputType === 'upload' ? '/upload' : '/scan',
          });
          return; // credit NOT consumed
        }

        // Cinematic pause so the orb breathes.
        await new Promise((r) => setTimeout(r, 2200));

        const reading = runAuraEngineFromAnalysis(best, inputType);

        // ONLY now do we consume the credit. Monthly subscribers are a no-op.
        const consumed = await consumeOneCredit();
        if (!consumed) {
          // Edge case: ran out between gate and now. Bounce to pricing.
          setErrorState({
            title: 'No reading available',
            reason: 'Please purchase a reading to continue.',
            retryTo: '/pricing',
          });
          return;
        }

        setCurrent(reading);
        await save(reading);
        router.replace('/result');
      } catch (e) {
        setErrorState({
          title: 'Something went wrong',
          reason: 'Please try the scan again.',
          retryTo: '/scan',
        });
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errorState) {
    return (
      <ScreenContainer orbColour="Red">
        <View style={styles.errBlock}>
          <Text style={styles.errTitle}>{errorState.title}</Text>
          <Text style={styles.errBody}>{errorState.reason}</Text>
          <Text style={styles.refund}>Your reading credit was not used.</Text>
        </View>
        <PremiumButton label="Try Again" onPress={() => router.replace(errorState.retryTo as any)} />
        <PremiumButton label="Back to Home" onPress={() => router.replace('/')} variant="subtle" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} particles>
      <View style={styles.center}>
        <AuraOrb size={300} colour="Violet" secondary="Gold" />
        <Text
          style={styles.step}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          accessibilityLabel={`${copy.processing[step]} Step ${step + 1} of ${copy.processing.length}.`}
          maxFontSizeMultiplier={1.5}
        >
          {copy.processing[step]}
        </Text>
        <Text style={styles.dis} maxFontSizeMultiplier={1.4}>{copy.disclaimers.short}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  step: { color: theme.colors.softWhite, fontSize: 18, letterSpacing: 0.4, fontWeight: '300' },
  dis: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', paddingHorizontal: 24 },
  errBlock: { gap: 12, paddingVertical: 24 },
  errTitle: { color: theme.colors.softWhite, fontSize: 24, fontWeight: '300' },
  errBody: { color: theme.colors.mute, fontSize: 15, lineHeight: 22 },
  refund: { color: theme.colors.dim, fontSize: 12, marginTop: 8 },
});
