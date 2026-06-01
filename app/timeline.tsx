import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { AuraOrb } from '@/components/AuraOrb';
import { theme } from '@/constants/theme';
import { copy } from '@/constants/copy';
import { useEntitlementStore, canAccessMonthlyFeatures } from '@/store/useEntitlementStore';
import { useReadingStore } from '@/store/useReadingStore';
import { useAuthStore, canCloudSync } from '@/store/useAuthStore';

export default function Timeline() {
  const hasMonthly = useEntitlementStore((s) => s.hasMonthly);
  const readings = useReadingStore((s) => s.readings);
  const syncNow = useReadingStore((s) => s.syncNow);
  const syncing = useReadingStore((s) => s.syncing);
  const lastSync = useReadingStore((s) => s.lastSync);
  const auth = useAuthStore((s) => ({
    isConfigured: s.isConfigured,
    isAuthenticated: s.isAuthenticated,
    cloudSyncEnabled: s.cloudSyncEnabled,
  }));
  const cloudOn = canCloudSync(auth);

  if (!canAccessMonthlyFeatures({ hasMonthly })) {
    return (
      <ScreenContainer orbColour="Indigo">
        <View style={styles.backRow}>
          <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
        </View>
        <Text style={styles.title}>Aura Timeline</Text>
        <GlassCard strong>
          <Text style={styles.lockTitle}>Monthly only</Text>
          <Text style={styles.lockBody}>
            Track your aura across time, upload photos from different chapters, and see how
            your energetic signature evolves.
          </Text>
          <PremiumButton label="Upgrade to Monthly" onPress={() => router.push('/pricing')} />
        </GlassCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer orbColour="Blue" orbSecondary="Gold">
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>
      <Text style={styles.title}>Aura Timeline</Text>
      <Text style={styles.sub}>Your readings, newest first.</Text>

      <View style={styles.syncRow}>
        <Text
          style={styles.syncStatus}
          accessibilityLiveRegion="polite"
          accessibilityLabel={
            cloudOn
              ? lastSync
                ? `Last sync ${lastSync.status}. ${lastSync.pushed} pushed, ${lastSync.pulled} pulled.`
                : 'Cloud sync is on'
              : 'Local only — cloud sync off'
          }
        >
          {cloudOn
            ? lastSync
              ? lastSync.status === 'success'
                ? copy.timeline.syncedJustNow(lastSync.pushed, lastSync.pulled)
                : 'Sync paused — try again'
              : 'Cloud sync ready'
            : copy.timeline.localOnly}
        </Text>
        {cloudOn && (
          <PremiumButton
            label={syncing ? 'Syncing…' : 'Sync Now'}
            onPress={() => syncNow()}
            variant="subtle"
            disabled={syncing}
          />
        )}
      </View>

      {readings.length === 0 ? (
        <GlassCard strong>
          <View style={styles.emptyOrb}>
            <AuraOrb size={140} colour="Violet" secondary="Gold" intensity={0.85} />
          </View>
          <Text style={styles.emptyTitle}>{copy.timeline.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{copy.timeline.emptyBody}</Text>
          <View style={{ height: 16 }} />
          <PremiumButton label={copy.timeline.emptyCta} onPress={() => router.push('/scan')} />
        </GlassCard>
      ) : (
        <>
          {readings.length >= 2 && (
            <PremiumButton label="Compare two readings" onPress={() => router.push('/compare')} variant="ghost" />
          )}
          {readings.map((r) => (
            <Pressable
              key={r.readingId}
              onPress={() => router.push(`/reading/${r.readingId}` as any)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${r.auraResult.label}, score ${r.auraResult.score} out of 100, ${new Date(r.timestamp).toLocaleDateString()}`}
              accessibilityHint="Double tap to open this reading"
            >
              <GlassCard>
                <View style={styles.rowHead}>
                  <Text style={styles.rowLabel}>{r.auraResult.label}</Text>
                  <Text style={styles.rowScore}>{r.auraResult.score}</Text>
                </View>
                <Text style={styles.rowMeta}>
                  {new Date(r.timestamp).toLocaleString()} · {r.auraResult.dominantColour} · {r.auraResult.element}
                </Text>
                <Text style={styles.rowBody} numberOfLines={3}>{r.guidance.summary}</Text>
                <Text style={styles.rowOpen}>Open →</Text>
              </GlassCard>
            </Pressable>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 28, fontWeight: '300' },
  sub: { color: theme.colors.mute, fontSize: 14 },
  lockTitle: { color: theme.colors.auraGold, letterSpacing: 2, fontSize: 11, textTransform: 'uppercase', marginBottom: 8 },
  lockBody: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22, marginBottom: 16 },
  empty: { color: theme.colors.mute, marginBottom: 16, fontSize: 14 },
  emptyOrb: { alignItems: 'center', marginBottom: 8 },
  emptyTitle: { color: theme.colors.softWhite, fontSize: 18, fontWeight: '500', textAlign: 'center', marginTop: 4 },
  emptyBody: { color: theme.colors.mute, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: theme.colors.softWhite, fontSize: 16, fontWeight: '500' },
  rowScore: { color: theme.colors.auraGold, fontSize: 18 },
  rowMeta: { color: theme.colors.dim, fontSize: 11, marginTop: 4, letterSpacing: 0.5 },
  rowBody: { color: theme.colors.mute, fontSize: 13, marginTop: 8, lineHeight: 19 },
  rowOpen: { color: theme.colors.auraGold, fontSize: 11, letterSpacing: 1.5, marginTop: 10 },
  syncRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  syncStatus: { color: theme.colors.dim, fontSize: 11, letterSpacing: 0.5 },
});
