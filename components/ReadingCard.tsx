import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from './GlassCard';
import { AuraOrb } from './AuraOrb';
import { theme } from '@/constants/theme';
import type { SavedReading } from '@/types/reading';

interface Props {
  reading: SavedReading;
  compact?: boolean;
}

const ZONE_LABEL: Record<string, string> = {
  forehead: 'Forehead', brows: 'Brows', eyes: 'Eyes', nose: 'Nose',
  cheeks: 'Cheeks', mouth: 'Mouth', chinJaw: 'Chin & Jaw',
};

export function ReadingCard({ reading, compact }: Props) {
  const r = reading.auraResult;
  const zones = Object.entries(reading.mienShiangZones);
  const orbSize = compact ? 140 : 240;

  return (
    <View style={styles.wrap}>
      <View style={styles.orbWrap}>
        <AuraOrb size={orbSize} colour={r.dominantColour} secondary={r.secondaryColour} />
      </View>

      <GlassCard strong>
        <Text style={styles.label}>{r.label.toUpperCase()}</Text>
        <Text style={styles.scoreRow}>
          <Text style={styles.score}>{r.score}</Text>
          <Text style={styles.scoreOf}> / 100</Text>
        </Text>
        <View style={styles.metaRow}>
          <Meta k="Dominant" v={r.dominantColour} />
          <Meta k="Secondary" v={r.secondaryColour} />
          <Meta k="Element" v={r.element} />
          <Meta k="Confidence" v={`${r.confidence}%`} />
        </View>
        <Text style={styles.timestamp}>{new Date(reading.timestamp).toLocaleString()}</Text>
      </GlassCard>

      <GlassCard>
        <Text style={styles.sectionTitle}>Guidance</Text>
        <Text style={styles.body}>{reading.guidance.summary}</Text>
      </GlassCard>

      <GlassCard>
        <Text style={styles.sectionTitle}>Mien Shiang zones</Text>
        {zones.map(([k, z]) => (
          <View key={k} style={styles.zoneRow}>
            <View style={styles.zoneHead}>
              <Text style={styles.zoneTitle}>{ZONE_LABEL[k] ?? k}</Text>
              <Text style={styles.zoneScore}>{z.score}</Text>
            </View>
            <View style={styles.zoneBarBg}>
              <View style={[styles.zoneBarFill, { width: `${z.score}%` }]} />
            </View>
            <Text style={styles.zoneBody}>{z.interpretation}</Text>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaK}>{k}</Text>
      <Text style={styles.metaV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  orbWrap: { alignItems: 'center', marginVertical: theme.spacing.sm },
  label: { color: theme.colors.auraGold, letterSpacing: 3, fontSize: 12 },
  scoreRow: { marginTop: 6 },
  score: { color: theme.colors.softWhite, fontSize: 56, fontWeight: '200', letterSpacing: -1 },
  scoreOf: { color: theme.colors.dim, fontSize: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 },
  metaItem: { flexBasis: '40%' },
  metaK: { color: theme.colors.dim, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  metaV: { color: theme.colors.softWhite, fontSize: 15, marginTop: 2 },
  timestamp: { color: theme.colors.dim, fontSize: 11, marginTop: 12, letterSpacing: 0.5 },
  sectionTitle: { color: theme.colors.softWhite, fontSize: 16, fontWeight: '500', marginBottom: 10 },
  body: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22 },
  zoneRow: { marginBottom: 14 },
  zoneHead: { flexDirection: 'row', justifyContent: 'space-between' },
  zoneTitle: { color: theme.colors.softWhite, fontSize: 14, fontWeight: '500' },
  zoneScore: { color: theme.colors.auraGold, fontSize: 14 },
  zoneBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 6 },
  zoneBarFill: { height: 4, backgroundColor: theme.colors.auraGold, borderRadius: 2 },
  zoneBody: { color: theme.colors.mute, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
