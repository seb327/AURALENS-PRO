import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';
import { redeemService } from '@/services/redeemService';
import { useEntitlementStore } from '@/store/useEntitlementStore';

export default function Redeem() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useEntitlementStore((s) => s.refresh);

  async function submit() {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert('Code', 'Please enter a code.');
      return;
    }
    setBusy(true);
    const res = await redeemService.redeem(trimmed);
    setBusy(false);

    if (!res.ok) {
      if (res.requiresSignIn) {
        Alert.alert('Sign in required', res.message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') },
        ]);
        return;
      }
      Alert.alert('Could not redeem', res.message);
      return;
    }

    // Refresh entitlement store from the cloud so credits / monthly reflect.
    try { await refresh(); } catch { /* best-effort */ }

    const summary = res.grant === 'monthly'
      ? 'Monthly access is now active. Enjoy unlimited readings and the Aura Buddy.'
      : 'One reading credit has been added to your account.';

    Alert.alert('Redeemed', summary, [
      { text: 'OK', onPress: () => router.replace(res.grant === 'monthly' ? '/scan' : '/scan') },
    ]);
  }

  return (
    <ScreenContainer orbColour="Gold" orbSecondary="Violet">
      <View style={styles.backRow}>
        <PremiumButton label="← Back" onPress={() => router.back()} variant="subtle" />
      </View>
      <Text style={styles.title}>Redeem a code</Text>
      <Text style={styles.sub}>
        Have a VIP, press or partner code? Enter it here to unlock access.
      </Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GlassCard strong>
          <Text style={styles.label}>Code</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ENTER-CODE"
            placeholderTextColor={theme.colors.dim}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="VIP code"
            style={styles.input}
            maxFontSizeMultiplier={1.4}
          />
          <View style={{ height: 16 }} />
          {busy ? (
            <ActivityIndicator color={theme.colors.auraGold} />
          ) : (
            <PremiumButton label="Redeem" onPress={submit} disabled={busy} />
          )}
        </GlassCard>
      </KeyboardAvoidingView>

      <Text style={styles.foot}>
        Codes are single-purpose. A monthly code unlocks the full subscription. A single-reading code adds one credit to your account. You must be signed in to redeem.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 30, fontWeight: '300' },
  sub: { color: theme.colors.mute, fontSize: 15, lineHeight: 22 },
  label: { color: theme.colors.dim, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  input: {
    color: theme.colors.softWhite,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: theme.colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: 14,
    marginTop: 6,
    fontSize: 16,
    letterSpacing: 1.5,
  },
  foot: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12 },
});
