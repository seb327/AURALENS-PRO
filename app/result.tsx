import { router } from 'expo-router';
import { Share, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { AuraOrb } from '@/components/AuraOrb';
import { copy } from '@/constants/copy';
import { theme } from '@/constants/theme';
import { useReadingStore } from '@/store/useReadingStore';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { useAuthStore, canCloudSync } from '@/store/useAuthStore';

export default function Result() {
  const reading = useReadingStore((s) => s.current);
  const lastSync = useReadingStore((s) => s.lastSync);
  const hasMonthly = useEntitlementStore((s) => s.hasMonthly);
  const auth = useAuthStore((s) => ({
    isConfigured: s.isConfigured,
    isAuthenticated: s.isAuthenticated,
    cloudSyncEnabled: s.cloudSyncEnabled,
  }));
  const cloudOn = canCloudSync(auth);
  const syncedThisReading = cloudOn && lastSync?.status === 'success' && lastSync.pushed > 0;

  if (!reading) {
    return (
      <ScreenContainer>
        <Text style={styles.fallback}>No reading available.</Text>
        <PremiumButton label="Start a Scan" onPress={() => router.replace('/scan')} />
      </ScreenContainer>
    );
  }

  const r = reading.auraResult;
  const zones = Object.entries(reading.mienShiangZones);

  function share() {
    Share.share({
      message: `My aura reading: ${r.label} (${r.score}/100). Dominant colour ${r.dominantColour}, element ${r.element}.`,
    }).catch(() => {});
  }

  return (
    <ScreenContainer orbColour={r.dominantColour} orbSecondary={r.secondaryColour}>
      <View style={styles.headerRow}>
        <PremiumButton label="✕ Close" onPress={() => router.replace('/')} variant="subtle" />
      </View>

      <View style={styles.heroOrb}>
        <AuraOrb size={240} colour={r.dominantColour} secondary={r.secondaryColour} />
      </View>

      <GlassCard strong>
        <Text style={styles.label}>{r.label.toUpperCase()}</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{r.score}</Text>
          <Text style={styles.scoreOf}> / 100</Text>
        </View>
        <Text style={styles.signature}>
          {r.dominantColour} signature · {r.element} element · {r.confidence}% confidence
        </Text>
      </GlassCard>

      {hasMonthly ? (
        <PremiumButton label={copy.result.askBuddy} onPress={() => router.push('/buddy')} />
      ) : (
        <GlassCard>
          <Text style={styles.unlockTitle}>{copy.result.unlockTitle}</Text>
          <Text style={styles.unlockBody}>{copy.result.unlockBody}</Text>
          <View style={{ height: 12 }} />
          <PremiumButton label={copy.result.unlockCta} onPress={() => router.push('/pricing')} />
        </GlassCard>
      )}

      <GlassCard>
        <Text style={styles.sectionTitle}>Your guidance</Text>
        <Text style={styles.summary}>{reading.guidance.summary}</Text>
        <Text style={styles.subSection}>Maintain</Text>
        {reading.guidance.maintainGoodEnergy.map((g) => (
          <Bullet key={g} label={g} colour={theme.colors.auraGreen} />
        ))}
        <Text style={styles.subSection}>Release</Text>
        {reading.guidance.reduceHeavyEnergy.map((g) => (
          <Bullet key={g} label={g} colour={theme.colors.auraRed} />
        ))}
        <Text style={styles.subSection}>Daily practice</Text>
        <Text style={styles.body}>{reading.guidance.dailyPractice}</Text>
        <Text style={styles.subSection}>Reflection</Text>
        <Text style={[styles.body, styles.italic]}>{reading.guidance.reflectionQuestion}</Text>
      </GlassCard>

      <GlassCard>
        <Text style={styles.sectionTitle}>Mien Shiang zones</Text>
        {zones.map(([k, z]) => (
          <View key={k} style={styles.zoneRow}>
            <View style={styles.zoneHead}>
              <Text style={styles.zoneTitle}>{labelForZone(k)}</Text>
              <Text style={styles.zoneScore}>{z.score}</Text>
            </View>
            <View style={styles.zoneBarBg}>
              <View style={[styles.zoneBarFill, { width: `${z.score}%` }]} />
            </View>
            <Text style={styles.zoneTheme}>{z.theme}</Text>
            <Text style={styles.zoneBody}>{z.interpretation}</Text>
          </View>
        ))}
      </GlassCard>

      <View style={styles.secondaryActions}>
        <PremiumButton label={copy.result.share} onPress={share} variant="ghost" style={styles.secondaryBtn} />
        <PremiumButton label={copy.result.again} onPress={() => router.replace('/scan')} variant="ghost" style={styles.secondaryBtn} />
      </View>

      <Text style={styles.syncTag}>
        {cloudOn ? (syncedThisReading ? '☁ Synced to your account' : '☁ Saving to cloud…') : '✓ Saved on this device'}
      </Text>
      <Text style={styles.dis}>{reading.disclaimer}</Text>
    </ScreenContainer>
  );
}

function Bullet({ label, colour }: { label: string; colour: string }) {
  return (
    <View style={styles.bullet}>
      <View style={[styles.bulletDot, { backgroundColor: colour }]} />
      <Text style={styles.bulletText}>{label}</Text>
    </View>
  );
}

function labelForZone(k: string): string {
  switch (k) {
    case 'forehead': return 'Forehead';
    case 'brows': return 'Brows';
    case 'eyes': return 'Eyes';
    case 'nose': return 'Nose';
    case 'cheeks': return 'Cheeks';
    case 'mouth': return 'Mouth';
    case 'chinJaw': return 'Chin & Jaw';
    default: return k;
  }
}

const styles = StyleSheet.create({
  headerRow: { alignItems: 'flex-end' },
  heroOrb: { alignItems: 'center', marginTop: -8 },
  label: {
    color: theme.colors.auraGold,
    letterSpacing: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  score: { color: theme.colors.softWhite, fontSize: 72, fontWeight: '200', letterSpacing: -2 },
  scoreOf: { color: theme.colors.dim, fontSize: 18 },
  signature: { color: theme.colors.mute, fontSize: 13, marginTop: 8, letterSpacing: 0.4 },
  summary: { color: theme.colors.softWhite, fontSize: 15, lineHeight: 23, marginBottom: 12 },
  secondaryActions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1 },
  sectionTitle: { color: theme.colors.softWhite, fontSize: 18, fontWeight: '500', marginBottom: 10 },
  subSection: { color: theme.colors.auraGold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  body: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22 },
  italic: { fontStyle: 'italic', color: theme.colors.mute },
  bullet: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bulletText: { color: theme.colors.softWhite, fontSize: 13, lineHeight: 20, flex: 1 },
  zoneRow: { marginBottom: 16 },
  zoneHead: { flexDirection: 'row', justifyContent: 'space-between' },
  zoneTitle: { color: theme.colors.softWhite, fontSize: 15, fontWeight: '500' },
  zoneScore: { color: theme.colors.auraGold, fontSize: 15 },
  zoneBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6 },
  zoneBarFill: { height: 4, backgroundColor: theme.colors.auraGold, borderRadius: 2 },
  zoneTheme: { color: theme.colors.dim, fontSize: 11, marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' },
  zoneBody: { color: theme.colors.mute, fontSize: 13, lineHeight: 19, marginTop: 4 },
  unlockTitle: { color: theme.colors.auraGold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  unlockBody: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 21 },
  syncTag: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', marginTop: theme.spacing.lg, letterSpacing: 0.5 },
  dis: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: theme.spacing.sm },
  fallback: { color: theme.colors.softWhite, fontSize: 16, textAlign: 'center' },
});
