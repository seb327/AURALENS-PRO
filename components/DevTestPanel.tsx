/**
 * Dev-only Live Test Panel.
 *
 * Renders **only when __DEV__ is true**. In production builds the whole file
 * tree-shakes to `null`. Provides one-tap navigation to every screen the
 * integration verifier covers, plus inline status pills so a reviewer can
 * confirm the live backend from any starting point.
 *
 * Place at the bottom of any screen that needs the shortcut — currently Hero
 * and Settings.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { theme } from '@/constants/theme';
import { useAuthStore, canCloudSync } from '@/store/useAuthStore';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { useReadingStore } from '@/store/useReadingStore';
import { useBuddyStore } from '@/store/useBuddyStore';

interface QuickLink {
  label: string;
  path: string;
  hint?: string;
}

const QUICK_LINKS: QuickLink[] = [
  { label: 'Auth / Sign In', path: '/auth',         hint: '/auth' },
  { label: 'Settings',       path: '/settings',     hint: '/settings' },
  { label: 'Aura Buddy',     path: '/buddy',        hint: '/buddy' },
  { label: 'Timeline',       path: '/timeline',     hint: '/timeline' },
  { label: 'Pricing',        path: '/pricing',      hint: '/pricing' },
  { label: 'Scan',           path: '/scan',         hint: '/scan' },
  { label: 'Privacy',        path: '/privacy',      hint: '/privacy' },
  { label: 'Delete Data',    path: '/delete-data',  hint: '/delete-data' },
];

export function DevTestPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  if (!__DEV__) return null;
  return <DevTestPanelInner defaultOpen={defaultOpen} />;
}

function DevTestPanelInner({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const auth = useAuthStore();
  const ent = useEntitlementStore();
  const readings = useReadingStore();
  const buddy = useBuddyStore();

  const lastBuddyMsg = [...buddy.messages].reverse().find((m) => m.role === 'buddy');
  const buddyMode: 'live' | 'fallback' | 'server-ready' | 'offline' =
    lastBuddyMsg?.source === 'remote' ? 'live' :
    lastBuddyMsg?.source === 'fallback' ? 'fallback' :
    auth.isConfigured && auth.isAuthenticated ? 'server-ready' : 'offline';

  const cloudOn = canCloudSync({
    isAuthenticated: auth.isAuthenticated,
    cloudSyncEnabled: auth.cloudSyncEnabled,
    isConfigured: auth.isConfigured,
  });

  const supabaseUrl = (Constants.expoConfig?.extra as any)?.supabaseUrl;
  const easProjectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;

  const statusPills: { label: string; value: string; tone: 'ok' | 'mock' | 'warn' }[] = [
    { label: 'Supabase',  value: supabaseUrl ? 'LIVE' : 'NOT CONFIGURED', tone: supabaseUrl ? 'ok' : 'warn' },
    { label: 'Auth',      value: auth.isAuthenticated ? 'SIGNED IN' : 'ANON',     tone: auth.isAuthenticated ? 'ok' : 'warn' },
    { label: 'Monthly',   value: ent.hasMonthly ? 'ACTIVE' : 'INACTIVE',           tone: ent.hasMonthly ? 'ok' : 'warn' },
    { label: 'Buddy',     value: buddyMode.toUpperCase(),                         tone: buddyMode === 'live' ? 'ok' : 'warn' },
    { label: 'Sync',      value: cloudOn ? 'ON' : 'OFF',                          tone: cloudOn ? 'ok' : 'warn' },
    { label: 'RC',        value: ent.isConfigured ? 'LIVE' : 'MOCK',              tone: ent.isConfigured ? 'ok' : 'mock' },
    { label: 'EAS',       value: easProjectId ? 'OK' : 'MISSING',                 tone: easProjectId ? 'ok' : 'warn' },
  ];

  async function syncNow() {
    if (cloudOn) await readings.syncNow();
  }

  async function refreshSub() { await ent.refresh(); }

  return (
    <View style={styles.wrap} accessible={false}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.head}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Collapse dev test panel' : 'Expand dev test panel'}
      >
        <Text style={styles.headText}>{open ? '▾' : '▸'}  DEV · LIVE TEST PANEL</Text>
      </Pressable>

      {!open ? null : (
        <View style={styles.body}>
          <View style={styles.pillsRow}>
            {statusPills.map((p) => (
              <View key={p.label} style={[styles.pill, pillToneStyle(p.tone)]}>
                <Text style={styles.pillK}>{p.label}</Text>
                <Text style={[styles.pillV, pillToneText(p.tone)]}>{p.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.linksGrid}>
            {QUICK_LINKS.map((q) => (
              <Pressable
                key={q.path}
                onPress={() => router.push(q.path as any)}
                style={styles.link}
                accessibilityRole="link"
                accessibilityLabel={`Go to ${q.label}`}
              >
                <Text style={styles.linkLabel}>{q.label}</Text>
                <Text style={styles.linkPath}>{q.hint}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Pressable onPress={syncNow} style={[styles.action, !cloudOn && styles.actionDisabled]}>
              <Text style={styles.actionText}>{cloudOn ? 'Sync Now' : 'Sync Now (cloud off)'}</Text>
            </Pressable>
            <Pressable onPress={refreshSub} style={styles.action}>
              <Text style={styles.actionText}>Refresh Subscription</Text>
            </Pressable>
          </View>

          <Text style={styles.foot}>
            __DEV__ panel only. Removed from production. Routes work as direct URLs in web —
            try /auth, /settings, /buddy, /timeline, /privacy, /delete-data.
          </Text>
        </View>
      )}
    </View>
  );
}

function pillToneStyle(t: 'ok' | 'mock' | 'warn') {
  switch (t) {
    case 'ok':   return { borderColor: 'rgba(102,224,163,0.45)', backgroundColor: 'rgba(102,224,163,0.08)' };
    case 'mock': return { borderColor: 'rgba(244,199,107,0.40)', backgroundColor: 'rgba(244,199,107,0.06)' };
    case 'warn': return { borderColor: 'rgba(196,82,42,0.40)',   backgroundColor: 'rgba(196,82,42,0.06)' };
  }
}
function pillToneText(t: 'ok' | 'mock' | 'warn') {
  switch (t) {
    case 'ok':   return { color: theme.colors.auraGreen };
    case 'mock': return { color: theme.colors.auraGold };
    case 'warn': return { color: theme.colors.auraRed };
  }
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.35)',
    backgroundColor: 'rgba(244,199,107,0.04)',
    overflow: 'hidden',
  },
  head: { padding: 14 },
  headText: {
    color: theme.colors.auraGold,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
  },
  body: { padding: 14, paddingTop: 0, gap: 14 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillK: { color: theme.colors.dim, fontSize: 9, letterSpacing: 1 },
  pillV: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  linksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  link: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    minWidth: 130,
    flexGrow: 1,
  },
  linkLabel: { color: theme.colors.softWhite, fontSize: 13, fontWeight: '500' },
  linkPath: { color: theme.colors.dim, fontSize: 10, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,199,107,0.45)',
    backgroundColor: 'rgba(244,199,107,0.10)',
    alignItems: 'center',
  },
  actionDisabled: { opacity: 0.4 },
  actionText: { color: theme.colors.auraGold, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  foot: { color: theme.colors.dim, fontSize: 10, lineHeight: 14, fontStyle: 'italic' },
});
