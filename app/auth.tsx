import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';

type Mode = 'signin' | 'signup' | 'magic';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuthStore();

  if (!auth.isConfigured) {
    return (
      <ScreenContainer orbColour="Indigo">
        <BackBar />
        <Text style={styles.title}>Cloud account</Text>
        <GlassCard>
          <Text style={styles.body}>
            Cloud sync is not configured in this build. You can still use {` `}AuraLens fully — every reading is saved on your device.
          </Text>
        </GlassCard>
        <PremiumButton label="Back to Settings" onPress={() => router.back()} variant="ghost" />
      </ScreenContainer>
    );
  }

  async function submit() {
    if (!email.includes('@')) {
      Alert.alert('Email', 'Please enter a valid email.');
      return;
    }
    if (mode === 'magic') {
      const r = await auth.sendMagicLink(email);
      Alert.alert('Magic link', r.ok ? 'Check your email for a sign-in link.' : r.message ?? 'Failed to send.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password', 'Use at least 8 characters.');
      return;
    }
    const r = mode === 'signin'
      ? await auth.signIn(email, password)
      : await auth.signUp(email, password);
    if (r.ok) {
      router.replace('/settings');
    } else {
      Alert.alert(mode === 'signin' ? 'Sign in failed' : 'Sign up failed', r.message ?? 'Please try again.');
    }
  }

  return (
    <ScreenContainer orbColour="Indigo" orbSecondary="Violet">
      <BackBar />
      <Text style={styles.title}>
        {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Magic link'}
      </Text>
      <Text style={styles.sub}>
        An account is optional. It enables cross-device sync of your reading history if you turn it on later.
      </Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GlassCard strong>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.dim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel="Email address"
            style={styles.input}
            maxFontSizeMultiplier={1.4}
          />

          {mode !== 'magic' && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={theme.colors.dim}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                accessibilityLabel="Password"
                accessibilityHint="At least 8 characters"
                style={styles.input}
                maxFontSizeMultiplier={1.4}
              />
            </>
          )}

          <View style={{ height: 16 }} />
          <PremiumButton
            label={auth.loading ? 'Working…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Magic Link'}
            onPress={submit}
            disabled={auth.loading}
          />
        </GlassCard>
      </KeyboardAvoidingView>

      <View style={styles.switchRow}>
        <PremiumButton
          label={mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          variant="subtle"
        />
        <PremiumButton
          label={mode === 'magic' ? 'Use password instead' : 'Send a magic link instead'}
          onPress={() => setMode(mode === 'magic' ? 'signin' : 'magic')}
          variant="subtle"
        />
      </View>

      <Text style={styles.foot}>
        By signing in you agree to the Privacy Policy and Terms. We never sell your data and never train models on your photos without explicit opt-in.
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

const styles = StyleSheet.create({
  backRow: { alignItems: 'flex-start' },
  title: { color: theme.colors.softWhite, fontSize: 28, fontWeight: '300' },
  sub: { color: theme.colors.mute, fontSize: 14, lineHeight: 21 },
  label: { color: theme.colors.dim, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  input: {
    color: theme.colors.softWhite,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: theme.colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: 14,
    marginTop: 6,
    fontSize: 15,
  },
  switchRow: { gap: 4 },
  body: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22 },
  foot: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12 },
});
