import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { useReadingStore } from '@/store/useReadingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBuddyStore } from '@/store/useBuddyStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { theme } from '@/constants/theme';

export default function RootLayout() {
  const hydrateEnt = useEntitlementStore((s) => s.hydrate);
  const hydrateReadings = useReadingStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateBuddy = useBuddyStore((s) => s.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateEnt();
    hydrateReadings();
    hydrateBuddy();
  }, [hydrateAuth, hydrateEnt, hydrateReadings, hydrateBuddy]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.obsidian }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.obsidian },
              animation: 'fade',
            }}
          />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
