import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  readings: 'auralens.readings.v1',
  entitlement: 'auralens.entitlement.v2',
  consent: 'auralens.consent.v1',
  buddy: 'auralens.buddy.history.v1',
  deviceId: 'auralens.deviceId.v1',
} as const;

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clearAll(): Promise<void> {
  await Promise.all(Object.values(STORAGE_KEYS).map((k) => AsyncStorage.removeItem(k)));
}
