import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { copy } from '@/constants/copy';
import { theme } from '@/constants/theme';
import { useEntitlementStore, canStartReading } from '@/store/useEntitlementStore';

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const camRef = useRef<CameraView>(null);

  const ent = useEntitlementStore((s) => ({ hasMonthly: s.hasMonthly, readingCredits: s.readingCredits }));

  async function startScan() {
    if (!canStartReading(ent)) {
      Alert.alert('No reading available', 'Please purchase a reading first.', [
        { text: 'OK', onPress: () => router.replace('/pricing') },
      ]);
      return;
    }
    if (!camRef.current) return;

    setCapturing(true);
    try {
      const photo = await camRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        Alert.alert('Capture failed', 'Please try again.');
        return;
      }
      // NOTE: credit is consumed inside processing, only after the engine
      // generates a successful result. Failed quality gates do not consume.
      router.push({
        pathname: '/processing',
        params: { inputType: 'camera', uris: JSON.stringify([photo.uri]) },
      });
    } catch (e) {
      Alert.alert('Camera error', 'Unable to capture. Please try again.');
    } finally {
      setCapturing(false);
    }
  }

  if (!permission) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={theme.colors.auraGold} />
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer orbColour="Indigo">
        <View style={styles.backRow}>
          <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
        </View>
        <Text style={styles.title}>Camera permission</Text>
        <GlassCard>
          <Text style={styles.desc}>{copy.disclaimers.consent}</Text>
        </GlassCard>
        <PremiumButton label="Allow Camera" onPress={requestPermission} />
        <PremiumButton label="Use 3 Photos Instead" onPress={() => router.replace('/upload')} variant="ghost" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer orb={false} particles={false}>
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>
      <Text style={styles.title}>{copy.scan.title}</Text>
      <Text style={styles.sub}>{copy.scan.sub}</Text>

      <View style={styles.camWrap}>
        <CameraView
          ref={camRef}
          style={styles.cam}
          facing="front"
          onCameraReady={() => setReady(true)}
        />
        <View pointerEvents="none" style={styles.frame} />
        <View pointerEvents="none" style={styles.frameCorners}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      <PremiumButton
        label={capturing ? 'Capturing…' : ready ? copy.scan.cta : 'Preparing…'}
        onPress={startScan}
        disabled={!ready || capturing}
      />
      <PremiumButton label="Upload 3 photos instead" onPress={() => router.replace('/upload')} variant="ghost" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 28, fontWeight: '300' },
  sub: { color: theme.colors.mute, fontSize: 14, lineHeight: 21 },
  desc: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22 },
  camWrap: {
    aspectRatio: 3 / 4, width: '100%',
    borderRadius: theme.radius.lg, overflow: 'hidden',
    backgroundColor: '#000', marginVertical: theme.spacing.md,
  },
  cam: { flex: 1 },
  frame: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.25)',
    borderRadius: theme.radius.lg,
  },
  frameCorners: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: theme.colors.auraGold },
  cornerTL: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8 },
  cornerTR: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8 },
  cornerBL: { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8 },
});
