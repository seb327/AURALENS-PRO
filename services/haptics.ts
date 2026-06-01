/**
 * Cross-platform haptics — web Vibration API + Expo Haptics on native.
 *
 * Web: feature-detected. If `navigator.vibrate` is missing, every call is
 * a silent no-op. Desktop Chrome/Firefox typically reject vibration
 * gracefully — only mobile browsers actually buzz.
 *
 * Native: re-exports thin wrappers over expo-haptics so callers don't have
 * to branch on Platform.OS themselves.
 *
 * All calls swallow errors. None of them throw, even when called from a
 * page that hasn't yet had a user gesture (some browsers reject vibration
 * without one — that's fine, the visual layer still runs).
 */

import { Platform } from 'react-native';
// Lazy-loaded to keep web bundle smaller; expo-haptics is a thin wrapper.
import * as ExpoHaptics from 'expo-haptics';

export function canVibrate(): boolean {
  if (Platform.OS !== 'web') return true; // assume expo-haptics is available
  if (typeof navigator === 'undefined') return false;
  return typeof (navigator as any).vibrate === 'function';
}

function safeVibrate(pattern: number | number[]): void {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof (navigator as any).vibrate === 'function') {
        (navigator as any).vibrate(pattern);
      }
    }
  } catch { /* never throw from a haptic */ }
}

/** Small tap when a user action starts (e.g. tap "Start Reading"). */
export function hapticLight(): void {
  if (Platform.OS === 'web') {
    safeVibrate(20);
    return;
  }
  ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Subtle double-tap pulse as a reading phase advances. */
export function hapticPhase(): void {
  if (Platform.OS === 'web') {
    safeVibrate([10, 40, 10]);
    return;
  }
  ExpoHaptics.selectionAsync().catch(() => {});
}

/** Slightly stronger bloom when the reading is ready to reveal. */
export function hapticSuccess(): void {
  if (Platform.OS === 'web') {
    safeVibrate([20, 50, 30]);
    return;
  }
  ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Trigger the WebGL shader energy bloom (web only — no-op on native). */
export function pulseShaderEnergy(amount = 1.0): void {
  if (Platform.OS !== 'web') return;
  try {
    const fn = (typeof window !== 'undefined' ? (window as any).auralensEnergyPulse : null) as
      | ((a?: number) => void)
      | null;
    if (fn) fn(amount);
  } catch { /* ignore */ }
}
