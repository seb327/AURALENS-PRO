import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { AuraOrb } from '@/components/AuraOrb';
import { theme } from '@/constants/theme';
import { useReadingStore } from '@/store/useReadingStore';
import { useEntitlementStore, canAccessMonthlyFeatures } from '@/store/useEntitlementStore';
import { compareReadings } from '@/engine/compareReadings';

const ZONE_LABEL: Record<string, string> = {
  forehead: 'Forehead', brows: 'Brows', eyes: 'Eyes', nose: 'Nose',
  cheeks: 'Cheeks', mouth: 'Mouth', chinJaw: 'Chin & Jaw',
};

export default function Compare() {
  const { fromId } = useLocalSearchParams<{ fromId?: string }>();
  const readings = useReadingStore((s) => s.readings);
  const hasMonthly = useEntitlementStore((s) => s.hasMonthly);

  const [beforeId, setBeforeId] = useState<string | undefined>(() => {
    if (fromId) return fromId;
    return readings[1]?.readingId ?? readings[0]?.readingId;
  });
  const [afterId, setAfterId] = useState<string | undefined>(() => {
    if (fromId && readings[0]?.readingId !== fromId) return readings[0]?.readingId;
    return readings[0]?.readingId;
  });

  const before = readings.find((r) => r.readingId === beforeId);
  const after = readings.find((r) => r.readingId === afterId);
  const cmp = useMemo(() => (before && after && before !== after ? compareReadings(before, after) : null), [before, after]);

  if (!canAccessMonthlyFeatures({ hasMonthly })) {
    return (
      <ScreenContainer orbColour="Indigo">
        <BackBar />
        <Text style={styles.title}>Compare readings</Text>
        <GlassCard strong>
          <Text style={styles.lockTitle}>Monthly only</Text>
          <Text style={styles.lockBody}>
            Compare your aura across different chapters of your life with AuraLens Monthly.
          </Text>
          <PremiumButton label="Unlock with Monthly" onPress={() => router.push('/pricing')} />
        </GlassCard>
      </ScreenContainer>
    );
  }

  if (readings.length < 2) {
    return (
      <ScreenContainer>
        <BackBar />
        <Text style={styles.title}>Compare readings</Text>
        <GlassCard>
          <Text style={styles.lockBody}>You need at least two saved readings to compare. Take another reading first.</Text>
          <PremiumButton label="Start Scan" onPress={() => router.push('/scan')} />
        </GlassCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      orbColour={after?.auraResult.dominantColour}
      orbSecondary={before?.auraResult.dominantColour}
    >
      <BackBar />
      <Text style={styles.title}>Then vs Now</Text>
      <Text style={styles.sub}>Pick two readings to compare their energetic signature.</Text>

      <Picker label="Then (older)" readings={readings} selectedId={beforeId} onSelect={setBeforeId} excludeId={afterId} />
      <Picker label="Now (newer)" readings={readings} selectedId={afterId} onSelect={setAfterId} excludeId={beforeId} />

      {before && after && cmp && (
        <>
          <View style={styles.pair}>
            <PairSide label="THEN" reading={before} />
            <PairSide label="NOW" reading={after} />
          </View>

          <GlassCard strong>
            <Text style={styles.eyebrow}>SUMMARY</Text>
            <Text style={styles.summary}>{cmp.summary}</Text>
            <View style={styles.deltaRow}>
              <Delta label="Score" before={before.auraResult.score} after={after.auraResult.score} suffix="" />
              <Delta label="Confidence" before={before.auraResult.confidence} after={after.auraResult.confidence} suffix="%" />
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={styles.eyebrow}>ZONE CHANGES</Text>
            {cmp.zones.map((z) => (
              <View key={z.zone} style={styles.zoneRow}>
                <Text style={styles.zoneName}>{ZONE_LABEL[z.zone]}</Text>
                <View style={styles.zoneBars}>
                  <View style={[styles.miniBar, { width: `${z.before}%`, opacity: 0.35 }]} />
                  <View style={[styles.miniBar, { width: `${z.after}%`, marginTop: 3 }]} />
                </View>
                <Text style={[styles.delta, z.delta > 0 ? styles.deltaUp : z.delta < 0 ? styles.deltaDown : null]}>
                  {z.delta > 0 ? `+${z.delta}` : z.delta}
                </Text>
              </View>
            ))}
          </GlassCard>
        </>
      )}

      <Text style={styles.dis}>
        Symbolic comparison only. Not medical, psychological, or diagnostic advice.
      </Text>
    </ScreenContainer>
  );
}

function BackBar() {
  return (
    <View style={styles.backRow}>
      <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
    </View>
  );
}

function Picker({
  label, readings, selectedId, onSelect, excludeId,
}: {
  label: string;
  readings: import('@/types/reading').SavedReading[];
  selectedId?: string;
  onSelect: (id: string) => void;
  excludeId?: string;
}) {
  return (
    <GlassCard>
      <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
      <View style={styles.pickerRow}>
        {readings.map((r) => {
          const disabled = r.readingId === excludeId;
          const selected = r.readingId === selectedId;
          return (
            <Pressable
              key={r.readingId}
              disabled={disabled}
              onPress={() => onSelect(r.readingId)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${label} option: ${r.auraResult.label}, score ${r.auraResult.score}, ${new Date(r.timestamp).toLocaleDateString()}`}
              accessibilityState={{ selected, disabled }}
              style={[styles.pickerChip, selected && styles.pickerChipSelected, disabled && styles.pickerChipDisabled]}
            >
              <Text style={[styles.pickerChipText, selected && styles.pickerChipTextSelected]}>
                {r.auraResult.label} · {r.auraResult.score}
              </Text>
              <Text style={styles.pickerChipDate}>{new Date(r.timestamp).toLocaleDateString()}</Text>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

function PairSide({ label, reading }: { label: string; reading: import('@/types/reading').SavedReading }) {
  return (
    <View style={styles.pairSide}>
      <Text style={styles.eyebrow}>{label}</Text>
      <View style={styles.pairOrb}>
        <AuraOrb size={120} colour={reading.auraResult.dominantColour} secondary={reading.auraResult.secondaryColour} intensity={0.9} />
      </View>
      <Text style={styles.pairLabel}>{reading.auraResult.label}</Text>
      <Text style={styles.pairScore}>{reading.auraResult.score}</Text>
      <Text style={styles.pairMeta}>{reading.auraResult.dominantColour} · {reading.auraResult.element}</Text>
      <Text style={styles.pairDate}>{new Date(reading.timestamp).toLocaleDateString()}</Text>
    </View>
  );
}

function Delta({ label, before, after, suffix }: { label: string; before: number; after: number; suffix: string }) {
  const d = after - before;
  const sign = d > 0 ? '+' : '';
  const colour = d > 0 ? theme.colors.auraGreen : d < 0 ? theme.colors.auraRed : theme.colors.mute;
  return (
    <View style={styles.deltaCell}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <Text style={styles.deltaValue}>{before}{suffix} → {after}{suffix}</Text>
      <Text style={[styles.deltaBig, { color: colour }]}>{sign}{d}{suffix}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 30, fontWeight: '300' },
  sub: { color: theme.colors.mute, fontSize: 14, lineHeight: 21 },
  eyebrow: { color: theme.colors.auraGold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  summary: { color: theme.colors.softWhite, fontSize: 15, lineHeight: 22 },
  deltaRow: { flexDirection: 'row', gap: 24, marginTop: 14 },
  deltaCell: { flex: 1 },
  deltaLabel: { color: theme.colors.dim, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  deltaValue: { color: theme.colors.softWhite, fontSize: 13, marginTop: 4 },
  deltaBig: { fontSize: 18, fontWeight: '500', marginTop: 4 },
  pair: { flexDirection: 'row', gap: 12 },
  pairSide: {
    flex: 1, alignItems: 'center', padding: theme.spacing.md,
    borderRadius: theme.radius.lg, borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline, backgroundColor: theme.colors.glass,
  },
  pairOrb: { marginVertical: 8 },
  pairLabel: { color: theme.colors.softWhite, fontSize: 14, fontWeight: '500', marginTop: 4 },
  pairScore: { color: theme.colors.auraGold, fontSize: 28, fontWeight: '200', marginTop: 2 },
  pairMeta: { color: theme.colors.mute, fontSize: 11, marginTop: 4 },
  pairDate: { color: theme.colors.dim, fontSize: 10, marginTop: 6 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pickerChipSelected: {
    borderColor: theme.colors.auraGold, backgroundColor: 'rgba(244,199,107,0.10)',
  },
  pickerChipDisabled: { opacity: 0.3 },
  pickerChipText: { color: theme.colors.softWhite, fontSize: 12 },
  pickerChipTextSelected: { color: theme.colors.auraGold },
  pickerChipDate: { color: theme.colors.dim, fontSize: 10, marginTop: 2 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  zoneName: { color: theme.colors.softWhite, fontSize: 13, width: 90 },
  zoneBars: { flex: 1 },
  miniBar: { height: 4, backgroundColor: theme.colors.auraGold, borderRadius: 2 },
  delta: { color: theme.colors.mute, fontSize: 13, width: 44, textAlign: 'right' },
  deltaUp: { color: theme.colors.auraGreen },
  deltaDown: { color: theme.colors.auraRed },
  dis: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: theme.spacing.lg },
  lockTitle: { color: theme.colors.auraGold, letterSpacing: 2, fontSize: 11, textTransform: 'uppercase', marginBottom: 8 },
  lockBody: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22, marginBottom: 16 },
});
