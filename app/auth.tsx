import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { GlassCard } from '@/components/GlassCard';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import type { OAuthProvider } from '@/services/authService';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const auth = useAuthStore();

  if (!auth.isConfigured) {
    return (
      <ScreenContainer orbColour="Indigo">
        <BackBar />
        <Text style={styles.title}>Cloud account</Text>
        <GlassCard>
          <Text style={styles.body}>
            Cloud sync is not configured in this build. You can still use AuraLens fully — every reading is saved on your device.
          </Text>
        </GlassCard>
        <PremiumButton label="Back to Home" onPress={() => router.replace('/')} variant="ghost" />
      </ScreenContainer>
    );
  }

  async function withOAuth(provider: OAuthProvider) {
    const r = await auth.signInWithOAuth(provider);
    if (!r.ok) {
      Alert.alert(
        `${labelFor(provider)} sign-in`,
        r.message ?? `${labelFor(provider)} is not enabled in this project. Use email and password instead.`,
      );
    }
    // On success the browser navigates away — no further action here.
  }

  async function submitEmail() {
    if (!email.includes('@')) {
      Alert.alert('Email', 'Please enter a valid email.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password', 'Use at least 8 characters.');
      return;
    }
    if (mode === 'signin') {
      const r = await auth.signIn(email, password);
      if (!r.ok) {
        Alert.alert('Sign in failed', r.message ?? 'Please try again.');
        return;
      }
      router.replace('/');
      return;
    }
    // Sign up
    const r = await auth.signUp(email, password);
    if (!r.ok) {
      Alert.alert('Sign up failed', r.message ?? 'Please try again.');
      return;
    }
    if (r.needsEmailConfirmation) {
      Alert.alert(
        'Check your email',
        `We sent a confirmation link to ${email}. Click it to activate your account, then come back here and sign in.`,
        [{ text: 'OK', onPress: () => setMode('signin') }],
      );
      return;
    }
    router.replace('/');
  }

  async function sendMagic() {
    if (!email.includes('@')) {
      Alert.alert('Email', 'Please enter a valid email first.');
      return;
    }
    const r = await auth.sendMagicLink(email);
    Alert.alert(
      'Magic link',
      r.ok ? `Check ${email} for a one-tap sign-in link.` : r.message ?? 'Could not send link.',
    );
  }

  return (
    <ScreenContainer orbColour="Indigo" orbSecondary="Violet">
      <BackBar />
      <Text style={styles.title}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
      <Text style={styles.sub}>
        An account holds your subscription and lets you sync readings across devices.
      </Text>

      {/* OAuth — primary CTAs */}
      <View style={styles.oauthBlock}>
        <OAuthButton
          provider="google"
          label="Continue with Google"
          onPress={() => withOAuth('google')}
        />
        <OAuthButton
          provider="apple"
          label="Continue with Apple"
          onPress={() => withOAuth('apple')}
        />
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Email / password */}
      {!showEmailForm ? (
        <PremiumButton
          label={mode === 'signin' ? 'Sign in with email' : 'Sign up with email'}
          onPress={() => setShowEmailForm(true)}
          variant="ghost"
        />
      ) : (
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
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={theme.colors.dim}
              secureTextEntry
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              textContentType="password"
              accessibilityLabel="Password"
              style={styles.input}
            />

            <View style={{ height: 16 }} />
            <PremiumButton
              label={
                auth.loading
                  ? 'Working…'
                  : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'
              }
              onPress={submitEmail}
              disabled={auth.loading}
            />
            <View style={{ height: 4 }} />
            <PremiumButton label="Email me a magic link" onPress={sendMagic} variant="subtle" />
          </GlassCard>
        </KeyboardAvoidingView>
      )}

      <View style={styles.switchRow}>
        <Pressable
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          accessibilityRole="button"
          hitSlop={10}
        >
          <Text style={styles.switchText}>
            {mode === 'signin'
              ? "New here? Create an account"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.foot}>
        By continuing you agree to the Privacy Policy and Terms. We never sell your data and never train models on your photos without explicit opt-in.
      </Text>
    </ScreenContainer>
  );
}

function labelFor(p: OAuthProvider): string {
  return p === 'google' ? 'Google' : 'Apple';
}

function OAuthButton({
  provider,
  label,
  onPress,
}: {
  provider: OAuthProvider;
  label: string;
  onPress: () => void;
}) {
  const isApple = provider === 'apple';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.oauthButton,
        isApple ? styles.oauthApple : styles.oauthGoogle,
        pressed && styles.oauthPressed,
      ]}
    >
      <Text style={styles.oauthIcon} accessible={false}>
        {isApple ? '' : 'G'}
      </Text>
      <Text style={[styles.oauthLabel, isApple ? styles.oauthLabelLight : styles.oauthLabelDark]}>
        {label}
      </Text>
    </Pressable>
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
  sub: { color: theme.colors.mute, fontSize: 14, lineHeight: 21, marginBottom: 4 },
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
  body: { color: theme.colors.softWhite, fontSize: 14, lineHeight: 22 },
  oauthBlock: { gap: 10, marginTop: 4 },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  oauthGoogle: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  oauthApple: {
    backgroundColor: '#000000',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  oauthPressed: { opacity: 0.85 },
  oauthIcon: {
    fontSize: 18,
    fontWeight: '700',
    width: 22,
    textAlign: 'center',
    color: '#4285F4',
  },
  oauthLabel: { fontSize: 15, fontWeight: '500', letterSpacing: 0.3 },
  oauthLabelDark: { color: '#1a1a1a' },
  oauthLabelLight: { color: '#FFFFFF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline },
  dividerText: { color: theme.colors.dim, fontSize: 11, letterSpacing: 2 },
  switchRow: { alignItems: 'center', marginTop: 6 },
  switchText: {
    color: theme.colors.auraGold,
    fontSize: 13,
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
  },
  foot: { color: theme.colors.dim, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 8 },
});
