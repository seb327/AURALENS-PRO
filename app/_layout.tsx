import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { useReadingStore } from '@/store/useReadingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBuddyStore } from '@/store/useBuddyStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuraShaderBackground } from '@/components/AuraShaderBackground';
import { theme } from '@/constants/theme';

// ─── Web-safe Alert.alert ────────────────────────────────────────────────────
// react-native-web's Alert.alert just calls window.alert() and DROPS the
// `buttons` array entirely — so any flow that relies on the user tapping an
// "OK" button to navigate (e.g. "Sign in to purchase" → /auth) breaks silently.
// We patch it once at startup so every screen's existing `Alert.alert(title,
// msg, [{text:'OK', onPress: () => router.push(...)}])` calls fire correctly:
//   • single button → window.alert + run onPress
//   • cancel + primary → window.confirm + run the matching onPress
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  (Alert as any).alert = (
    title: string,
    message?: string,
    buttons?: Array<{ text?: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }>,
  ) => {
    const body = message ? `${title}\n\n${message}` : title;
    if (!buttons || buttons.length === 0) {
      window.alert(body);
      return;
    }
    if (buttons.length === 1) {
      window.alert(body);
      try { buttons[0]?.onPress?.(); } catch { /* swallow */ }
      return;
    }
    const primary =
      buttons.find((b) => b.style !== 'cancel' && b.style !== undefined) ??
      buttons.find((b) => b.style === undefined) ??
      buttons[buttons.length - 1];
    const cancel = buttons.find((b) => b.style === 'cancel');
    const confirmed = window.confirm(body);
    try {
      if (confirmed) primary?.onPress?.();
      else cancel?.onPress?.();
    } catch { /* swallow */ }
  };
}

export default function RootLayout() {
  const hydrateEnt = useEntitlementStore((s) => s.hydrate);
  const refreshEnt = useEntitlementStore((s) => s.refresh);
  const hydrateReadings = useReadingStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateBuddy = useBuddyStore((s) => s.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateEnt();
    hydrateReadings();
    hydrateBuddy();

    // If the user just came back from Stripe Checkout, pull the latest
    // entitlement immediately so the credit / monthly flag reflects.
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location.search.includes('checkout=success')
    ) {
      setTimeout(() => { refreshEnt().catch(() => { /* best-effort */ }); }, 600);
    }
  }, [hydrateAuth, hydrateEnt, hydrateReadings, hydrateBuddy, refreshEnt]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.obsidian }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          {/* WebGL aura field — web only, renders behind everything else.
              On native it returns null. */}
          <AuraShaderBackground />
          <Stack
            screenOptions={{
              headerShown: false,
              // On web, let the shader show through. On native, keep obsidian.
              contentStyle: {
                backgroundColor:
                  Platform.OS === 'web' ? 'transparent' : theme.colors.obsidian,
              },
              animation: 'fade',
            }}
          />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
