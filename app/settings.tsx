import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { APP_DISPLAY_NAME } from '@/constants/copy';
import { theme } from '@/constants/theme';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { useReadingStore } from '@/store/useReadingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBuddyStore } from '@/store/useBuddyStore';

const MANAGE_URL: Record<string, string> = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
};

export default function Settings() {
  const ent = useEntitlementStore();
  const readings = useReadingStore();
  const auth = useAuthStore();
  const buddy = useBuddyStore();

  const [restoring, setRestoring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function doRestore() {
    setRestoring(true);
    const res = await ent.restore();
    setRestoring(false);
    if (!res.ok) Alert.alert('Restore', 'No purchases were restored.');
    else if (res.recoveredMonthly) Alert.alert('Restored', 'Your monthly subscription is active again.');
    else Alert.alert('Restore', 'Subscription state synced. App Store consumables cannot be restored after they are used.');
  }

  async function doRefreshSubscription() {
    setRefreshing(true);
    await ent.refresh();
    setRefreshing(false);
  }

  async function doSyncNow() {
    const r = await readings.syncNow();
    if (r.status === 'success') {
      Alert.alert('Synced', `Pushed ${r.pushed}, pulled ${r.pulled}.`);
    } else if (r.status === 'partial') {
      Alert.alert('Partial sync', r.message ?? 'Some operations failed.');
    } else if (r.status === 'skipped') {
      Alert.alert('Sync skipped', r.message ?? 'Cloud sync is off or not signed in.');
    } else {
      Alert.alert('Sync failed', r.message ?? 'Please try again.');
    }
  }

  function openManage() {
    const url = ent.managementURL ?? MANAGE_URL[Platform.OS] ?? MANAGE_URL.ios;
    Linking.openURL(url).catch(() => {});
  }

  async function toggleCloudSync(v: boolean) {
    if (v && !auth.isAuthenticated) {
      Alert.alert(
        'Sign in required',
        'Cloud sync needs an account. Create one or sign in?',
        [
          { text: 'Cancel' },
          { text: 'Continue', onPress: () => router.push('/auth') },
        ],
      );
      return;
    }
    await auth.setCloudSyncEnabled(v);
  }

  async function togglePhotoUpload(v: boolean) {
    if (v && !auth.isAuthenticated) {
      Alert.alert(
        'Sign in required',
        'Photo upload needs an account and cloud sync to be enabled.',
        [
          { text: 'Cancel' },
          { text: 'Continue', onPress: () => router.push('/auth') },
        ],
      );
      return;
    }
    await auth.setPhotoUploadConsent(v);
  }

  return (
    <ScreenContainer orbColour="White" orbSecondary="Blue">
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>
      <Text style={styles.title}>Settings</Text>

      <GlassCard strong>
        <Row k="App" v={APP_DISPLAY_NAME} />
        <Row k="Plan" v={ent.hasMonthly ? 'Monthly' : ent.readingCredits > 0 ? 'Single readings' : 'No active plan'} />
        <Row k="Reading credits" v={String(ent.readingCredits)} />
        <Row k="Saved readings" v={String(readings.readings.length)} />
      </GlassCard>

      <GlassCard>
        <Text style={styles.sectionTitle}>Account</Text>
        {auth.isAuthenticated ? (
          <>
            <Row k="Signed in as" v={auth.session?.user.email ?? auth.session?.user.id ?? '—'} />
            <View style={{ height: 8 }} />
            <PremiumButton label="Sign Out" onPress={auth.signOut} variant="ghost" />
          </>
        ) : auth.isConfigured ? (
          <>
            <Text style={styles.body}>
              An account is optional. Sign in to enable cross-device sync.
            </Text>
            <View style={{ height: 12 }} />
            <PremiumButton label="Sign In / Create Account" onPress={() => router.push('/auth')} variant="ghost" />
          </>
        ) : (
          <Text style={styles.body}>Cloud sync is not configured in this build. {APP_DISPLAY_NAME} is fully working offline.</Text>
        )}
      </GlassCard>

      {auth.isConfigured && (
        <GlassCard>
          <Text style={styles.sectionTitle}>Cloud sync</Text>
          <ToggleRow
            label="Sync readings to cloud"
            sub="Your reading history (no images) is backed up to your account."
            value={auth.cloudSyncEnabled}
            onChange={toggleCloudSync}
          />
          <ToggleRow
            label="Upload photos"
            sub="Save the photos used for readings. Off by default. Photos are private to you and signed-URL only."
            value={auth.photoUploadConsent}
            onChange={togglePhotoUpload}
          />
          <View style={{ height: 12 }} />
          <PremiumButton label="Sync Now" onPress={doSyncNow} variant="ghost" disabled={readings.syncing} />
          {readings.lastSync && (
            <Text style={styles.subtle}>
              {readings.lastSync.status === 'success'
                ? `Synced ${new Date(readings.lastSync.at).toLocaleTimeString()} · ${readings.lastSync.pushed} pushed, ${readings.lastSync.pulled} pulled`
                : `${readings.lastSync.status} · ${new Date(readings.lastSync.at).toLocaleTimeString()}`}
            </Text>
          )}
        </GlassCard>
      )}

      <GlassCard>
        <Text style={styles.sectionTitle}>Purchases</Text>
        <PremiumButton label={restoring ? 'Restoring…' : 'Restore Purchases'} onPress={doRestore} variant="ghost" disabled={restoring} />
        <View style={{ height: 8 }} />
        <PremiumButton label={refreshing ? 'Syncing…' : 'Refresh Subscription Status'} onPress={doRefreshSubscription} variant="ghost" disabled={refreshing} />
        {ent.hasMonthly && (
          <>
            <View style={{ height: 8 }} />
            <PremiumButton label="Manage Subscription" onPress={openManage} variant="ghost" />
          </>
        )}
        <View style={{ height: 8 }} />
        <PremiumButton label="See Pricing" onPress={() => router.push('/pricing')} variant="subtle" />
      </GlassCard>

      <GlassCard>
        <Text style={styles.sectionTitle}>Aura Buddy</Text>
        <Row k="Stored messages" v={String(buddy.messages.length)} />
        <View style={{ height: 8 }} />
        <PremiumButton
          label="Clear Aura Buddy history"
          onPress={() => {
            Alert.alert('Clear Aura Buddy?', 'Removes the conversation from this device. Cloud copies (if any) remain in your account.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => buddy.clear() },
            ]);
          }}
          variant="ghost"
        />
      </GlassCard>

      <GlassCard>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <PremiumButton label="Privacy Policy" onPress={() => router.push('/privacy')} variant="ghost" />
        <View style={{ height: 8 }} />
        <PremiumButton label="Delete My Data" onPress={() => router.push('/delete-data')} variant="ghost" />
      </GlassCard>

      <Text style={styles.foot}>
        This reading is for reflection, spiritual entertainment, and wellbeing guidance only. It is not medical, psychological, or diagnostic advice.
      </Text>
    </ScreenContainer>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={styles.rowV} numberOfLines={2}>{v}</Text>
    </View>
  );
}

function ToggleRow({
  label, sub, value, onChange,
}: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#333', true: '#9B6CFF' }}
        thumbColor={value ? '#F4C76B' : '#888'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 28, fontWeight: '300' },
  sectionTitle: { color: theme.colors.softWhite, fontSize: 16, fontWeight: '500', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 16 },
  rowK: { color: theme.colors.mute, fontSize: 13, letterSpacing: 0.5, flexShrink: 0 },
  rowV: { color: theme.colors.softWhite, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  toggleLabel: { color: theme.colors.softWhite, fontSize: 14, fontWeight: '500' },
  toggleSub: { color: theme.colors.dim, fontSize: 12, marginTop: 4, lineHeight: 17 },
  body: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22 },
  subtle: { color: theme.colors.dim, fontSize: 11, marginTop: 8 },
  foot: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12 },
});
