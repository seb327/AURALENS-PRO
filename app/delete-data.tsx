import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';
import { clearAll as wipeLocal } from '@/services/storage';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { useReadingStore } from '@/store/useReadingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { readingSyncService } from '@/services/readingSyncService';
import { cloudStorageService } from '@/services/cloudStorageService';
import { entitlementSyncService } from '@/services/entitlementSyncService';

type Mode = 'idle' | 'local' | 'cloud-readings' | 'cloud-photos' | 'account' | 'all';

export default function DeleteData() {
  const [busy, setBusy] = useState<Mode>('idle');
  const ent = useEntitlementStore();
  const readings = useReadingStore();
  const auth = useAuthStore();

  function confirm(title: string, body: string, run: () => Promise<void>) {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  }

  async function deleteLocal() {
    confirm(
      'Delete local readings?',
      'Removes every reading saved on this device. Cloud copies (if any) are kept.',
      async () => {
        setBusy('local');
        await readings.clearAll();
        setBusy('idle');
        Alert.alert('Done', 'Local readings deleted.');
      },
    );
  }

  async function deleteCloudReadings() {
    if (!auth.isAuthenticated) {
      Alert.alert('Not signed in', 'Sign in to delete cloud data.');
      return;
    }
    confirm(
      'Delete cloud readings?',
      'Soft-deletes every reading in your cloud account. Local copies on this device are kept.',
      async () => {
        setBusy('cloud-readings');
        const r = await readingSyncService.softDeleteAll({
          enabled: true,
          userId: auth.session!.user.id,
          deviceId: readings.deviceId,
        });
        setBusy('idle');
        Alert.alert(r.status === 'success' ? 'Done' : 'Failed', r.message ?? 'Cloud readings deleted.');
      },
    );
  }

  async function deletePhotos() {
    if (!auth.isAuthenticated) {
      Alert.alert('Not signed in', 'Sign in to delete uploaded photos.');
      return;
    }
    confirm(
      'Delete uploaded photos?',
      'Removes every photo you have uploaded to {AuraLens}’s private storage.',
      async () => {
        setBusy('cloud-photos');
        const r = await cloudStorageService.deleteAllForUser(auth.session!.user.id);
        setBusy('idle');
        Alert.alert(r.ok ? 'Done' : 'Failed', r.ok ? `${r.deletedFiles} files deleted.` : 'Please try again.');
      },
    );
  }

  async function deleteAccountData() {
    if (!auth.isAuthenticated) {
      Alert.alert('Not signed in', 'Sign in to delete account data.');
      return;
    }
    confirm(
      'Delete cloud account data?',
      'Soft-deletes readings, removes uploaded photos, clears entitlement snapshots. Your account will remain so you can re-sign-in; for full account closure email support.',
      async () => {
        setBusy('account');
        const uid = auth.session!.user.id;
        await readingSyncService.softDeleteAll({ enabled: true, userId: uid, deviceId: readings.deviceId });
        await cloudStorageService.deleteAllForUser(uid);
        await entitlementSyncService.deleteAllForUser(uid);
        setBusy('idle');
        Alert.alert('Done', 'Cloud account data has been removed.');
      },
    );
  }

  async function deleteEverything() {
    confirm(
      'Delete everything?',
      'Wipes local readings, local entitlement state, cloud readings, uploaded photos, and entitlement snapshots. Your App Store / Play subscription itself must be cancelled in the store. This cannot be undone.',
      async () => {
        setBusy('all');
        if (auth.isAuthenticated) {
          const uid = auth.session!.user.id;
          await readingSyncService.softDeleteAll({ enabled: true, userId: uid, deviceId: readings.deviceId });
          await cloudStorageService.deleteAllForUser(uid);
          await entitlementSyncService.deleteAllForUser(uid);
        }
        await readings.clearAll();
        await ent.reset();
        await wipeLocal();
        setBusy('idle');
        Alert.alert('Done', 'All your data has been deleted from this device and your cloud account.', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      },
    );
  }

  return (
    <ScreenContainer orbColour="Red">
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>
      <Text style={styles.title}>Delete My Data</Text>

      <GlassCard strong>
        <Text style={styles.body}>
          You decide what to remove. Subscription cancellation must be done in your App Store or Google Play account.
        </Text>
      </GlassCard>

      <GlassCard>
        <Text style={styles.h}>Local readings</Text>
        <Text style={styles.b}>Every reading saved on this device.</Text>
        <PremiumButton label={busy === 'local' ? 'Deleting…' : 'Delete local readings'} onPress={deleteLocal} variant="ghost" disabled={busy !== 'idle'} />
      </GlassCard>

      <GlassCard>
        <Text style={styles.h}>Cloud readings</Text>
        <Text style={styles.b}>Soft-deletes readings from your cloud account.</Text>
        <PremiumButton label={busy === 'cloud-readings' ? 'Deleting…' : 'Delete cloud readings'} onPress={deleteCloudReadings} variant="ghost" disabled={busy !== 'idle'} />
      </GlassCard>

      <GlassCard>
        <Text style={styles.h}>Uploaded photos</Text>
        <Text style={styles.b}>Removes every photo you have uploaded.</Text>
        <PremiumButton label={busy === 'cloud-photos' ? 'Deleting…' : 'Delete uploaded photos'} onPress={deletePhotos} variant="ghost" disabled={busy !== 'idle'} />
      </GlassCard>

      <GlassCard>
        <Text style={styles.h}>Cloud account data</Text>
        <Text style={styles.b}>Readings + photos + entitlement snapshots in your account.</Text>
        <PremiumButton label={busy === 'account' ? 'Deleting…' : 'Delete cloud account data'} onPress={deleteAccountData} variant="ghost" disabled={busy !== 'idle'} />
      </GlassCard>

      <GlassCard strong>
        <Text style={styles.h}>Full delete request</Text>
        <Text style={styles.b}>Local + cloud + everything {`${' '}`}we can remove. Cannot be undone.</Text>
        <PremiumButton label={busy === 'all' ? 'Deleting…' : 'Delete Everything'} onPress={deleteEverything} disabled={busy !== 'idle'} />
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 28, fontWeight: '300' },
  body: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22 },
  h: { color: theme.colors.auraGold, letterSpacing: 2, fontSize: 11, textTransform: 'uppercase', marginBottom: 8 },
  b: { color: theme.colors.softWhite, fontSize: 13, lineHeight: 20, marginBottom: 12 },
});
