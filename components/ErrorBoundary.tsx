import React, { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    // Phase 2.7 (Sentry) will replace this with a real reporter.
    if (__DEV__) console.error('[AuraLens ErrorBoundary]', error);
  }

  reset = (): void => this.setState({ hasError: false, error: undefined });

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something drifted off course.</Text>
        <Text style={styles.body}>
          A rendering error stopped the screen from loading. Your readings are safe — they live on this device.
        </Text>
        {__DEV__ && this.state.error && (
          <Text style={styles.err}>{this.state.error.message}</Text>
        )}
        <Pressable onPress={this.reset} style={styles.btn}>
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.obsidian,
    padding: 32,
    justifyContent: 'center',
    gap: 16,
  },
  title: { color: theme.colors.softWhite, fontSize: 24, fontWeight: '300' },
  body: { color: theme.colors.mute, fontSize: 15, lineHeight: 22 },
  err: { color: theme.colors.auraRed, fontSize: 12, fontFamily: 'Courier' },
  btn: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.auraGold,
    alignSelf: 'flex-start',
  },
  btnText: { color: theme.colors.auraGold, fontSize: 14, letterSpacing: 0.5 },
});
