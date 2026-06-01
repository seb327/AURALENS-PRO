import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { DisplayTitle, Eyebrow, FadeUp, Subtitle } from '@/components/DisplayText';
import { copy } from '@/constants/copy';
import { theme } from '@/constants/theme';
import { PRODUCT_IDS, PRODUCT_CATALOG, type ProductId } from '@/constants/products';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { purchaseService } from '@/services/purchaseService';
import { stripeService } from '@/services/stripeService';

export default function Pricing() {
  const [busy, setBusy] = useState<ProductId | 'restore' | null>(null);
  const [prices, setPrices] = useState<Record<ProductId, string>>({
    [PRODUCT_IDS.singleReading]: PRODUCT_CATALOG.single.fallbackPrice,
    [PRODUCT_IDS.monthly]: PRODUCT_CATALOG.monthly.fallbackPrice,
  });
  const purchase = useEntitlementStore((s) => s.purchase);
  const restore = useEntitlementStore((s) => s.restore);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [single, monthly] = await Promise.all([
        purchaseService.getDisplayPrice(PRODUCT_IDS.singleReading),
        purchaseService.getDisplayPrice(PRODUCT_IDS.monthly),
      ]);
      if (!cancelled) {
        setPrices({
          [PRODUCT_IDS.singleReading]: single,
          [PRODUCT_IDS.monthly]: monthly,
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function buy(productId: ProductId) {
    setBusy(productId);
    const res = await purchase(productId);
    setBusy(null);
    if (res.cancelled) return;
    if (res.pending) {
      Alert.alert('Purchase pending', res.message ?? 'Your purchase is being processed.');
      return;
    }
    if (res.redirect && res.url) {
      // Stripe Checkout — open the hosted URL. On web this navigates the same
      // tab; on native the system browser opens. After payment Stripe redirects
      // back with ?checkout=success and the webhook updates entitlements.
      await stripeService.openCheckoutUrl(res.url);
      return;
    }
    if (!res.ok) {
      if (res.requiresSignIn) {
        Alert.alert(
          'Sign in to purchase',
          res.message ?? 'Your account holds your subscription.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.push('/auth') },
          ],
        );
        return;
      }
      Alert.alert('Purchase failed', res.message ?? 'Please try again.');
      return;
    }
    router.replace('/scan');
  }

  async function doRestore() {
    setBusy('restore');
    const res = await restore();
    setBusy(null);
    if (!res.ok) {
      Alert.alert('Restore', 'No purchases were restored.');
    } else if (res.recoveredMonthly) {
      Alert.alert('Restored', 'Your monthly subscription is active again.');
    } else {
      Alert.alert(
        'Restore',
        'Subscription state synced. Note: App Store consumable readings cannot be restored after they are used.',
      );
    }
  }

  return (
    <ScreenContainer orbColour="Gold" orbSecondary="Violet">
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>

      <FadeUp delay={60} style={{ gap: 12 }}>
        <Eyebrow>Choose your access</Eyebrow>
        <DisplayTitle size="page">{copy.pricing.title}</DisplayTitle>
        <Subtitle>{copy.pricing.sub}</Subtitle>
      </FadeUp>

      <FadeUp delay={220} style={{}}>
      <GlassCard strong>
        <Text style={styles.tierTitle}>{copy.pricing.single.title}</Text>
        <Text style={styles.price}>{prices[PRODUCT_IDS.singleReading]}</Text>
        <Text style={styles.desc}>{copy.pricing.single.desc}</Text>
        <View style={styles.features}>
          {copy.pricing.single.features.map((f) => <Feature key={f} label={f} />)}
        </View>
        {busy === PRODUCT_IDS.singleReading ? (
          <ActivityIndicator color={theme.colors.auraGold} />
        ) : (
          <PremiumButton label={copy.pricing.single.cta} onPress={() => buy(PRODUCT_IDS.singleReading)} />
        )}
      </GlassCard>
      </FadeUp>

      <FadeUp delay={360} style={{}}>
      <GlassCard strong glow>
        <View style={styles.recommendedRow}>
          <Text style={styles.tierTitle}>{copy.pricing.monthly.title}</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>Recommended</Text></View>
        </View>
        <Text style={styles.price}>{prices[PRODUCT_IDS.monthly]}</Text>
        <Text style={styles.whyMonthly}>{copy.pricing.monthly.whyMonthly}</Text>
        <Text style={styles.desc}>{copy.pricing.monthly.desc}</Text>
        <View style={styles.features}>
          {copy.pricing.monthly.features.map((f, i) => <Feature key={f} label={f} highlight={i < 2} />)}
        </View>
        {busy === PRODUCT_IDS.monthly ? (
          <ActivityIndicator color={theme.colors.auraGold} />
        ) : (
          <PremiumButton label={copy.pricing.monthly.cta} onPress={() => buy(PRODUCT_IDS.monthly)} />
        )}
        <Text style={styles.cancelNote}>{copy.pricing.cancelNote}</Text>
      </GlassCard>
      </FadeUp>

      <PremiumButton
        label="Restore Purchases"
        onPress={doRestore}
        variant="ghost"
        loading={busy === 'restore'}
        disabled={busy === 'restore'}
      />

      <PremiumButton
        label="Have a code? Redeem"
        onPress={() => router.push('/redeem')}
        variant="subtle"
      />

      <Text style={styles.foot}>{copy.disclaimers.short}</Text>
    </ScreenContainer>
  );
}

function Feature({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureTick}>✦</Text>
      <Text style={[styles.featureText, highlight && styles.featureTextHighlight]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 30, fontWeight: '300' },
  sub: { color: theme.colors.mute, fontSize: 15 },
  tierExplain: { color: theme.colors.dim, fontSize: 12, lineHeight: 18, marginTop: -8 },
  tierTitle: { color: theme.colors.softWhite, fontSize: 20, fontWeight: '500' },
  price: { color: theme.colors.auraGold, fontSize: 28, marginTop: 4, fontWeight: '300', letterSpacing: 0.5 },
  desc: { color: theme.colors.mute, fontSize: 14, lineHeight: 21, marginTop: 10 },
  features: { gap: 8, marginTop: theme.spacing.md, marginBottom: theme.spacing.lg },
  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  featureTick: { color: theme.colors.auraGold, marginTop: 2 },
  featureText: { color: theme.colors.mute, fontSize: 14, flex: 1, lineHeight: 21 },
  featureTextHighlight: { color: theme.colors.softWhite, fontWeight: '500' },
  whyMonthly: { color: theme.colors.auraGold, fontSize: 13, lineHeight: 20, marginTop: 8, fontStyle: 'italic' },
  cancelNote: { color: theme.colors.dim, fontSize: 11, lineHeight: 16, marginTop: 14, textAlign: 'center' },
  recommendedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.auraGold,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  badgeText: { color: theme.colors.auraGold, fontSize: 10, letterSpacing: 1.5 },
  devNote: {
    color: theme.colors.dim, fontSize: 11, textAlign: 'center', marginTop: 4, fontStyle: 'italic',
  },
  foot: { color: theme.colors.dim, fontSize: theme.size.micro, textAlign: 'center', marginTop: theme.spacing.md },
});
