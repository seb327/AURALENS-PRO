// Pure entitlement gating helpers. No side effects, no storage, no React.
// Imported by both the Zustand store and by tests without pulling AsyncStorage.

export interface EntitlementSnapshot {
  hasMonthly: boolean;
  readingCredits: number;
}

export function canStartReading(s: { hasMonthly: boolean; readingCredits: number }): boolean {
  return s.hasMonthly || s.readingCredits > 0;
}

export function canAccessMonthlyFeatures(s: { hasMonthly: boolean }): boolean {
  return s.hasMonthly;
}
