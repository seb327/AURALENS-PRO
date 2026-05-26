import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { PRODUCT_IDS, ENTITLEMENTS, type ProductId } from '@/constants/products';

// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat wrapper.
//
// In a development build (or release build) with `react-native-purchases`
// installed, this dynamically loads the SDK and proxies all calls to it.
//
// In Expo Go, `react-native-purchases` is unavailable. The wrapper returns a
// safe stub that reports `isConfigured = false` so the rest of the app falls
// back to local mock pricing for development.
// ─────────────────────────────────────────────────────────────────────────────

export interface RCPackage {
  identifier: string; // RC package identifier ('$rc_monthly', '$rc_lifetime'…)
  productId: string;
  priceString: string;
  title: string;
  description: string;
}

export interface RCOffering {
  identifier: string;
  packages: RCPackage[];
}

export interface RCCustomerInfo {
  originalAppUserId: string;
  activeEntitlements: string[];          // entitlement identifiers currently active
  activeSubscriptions: string[];         // product ids
  nonSubscriptionTransactionIds: string[]; // ids of one-off purchases (for credit reconciliation)
  managementURL?: string;
}

export type PurchaseOutcome =
  | { status: 'success'; productId: string; transactionId: string; customerInfo: RCCustomerInfo }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'error'; message: string };

export interface RevenueCatAPI {
  isConfigured: boolean;
  configure(userId?: string): Promise<void>;
  getOfferings(): Promise<RCOffering[]>;
  purchase(productId: ProductId): Promise<PurchaseOutcome>;
  restorePurchases(): Promise<RCCustomerInfo>;
  getCustomerInfo(): Promise<RCCustomerInfo>;
  logOut(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stub implementation used when the SDK is not present.
// ─────────────────────────────────────────────────────────────────────────────

const stub: RevenueCatAPI = {
  isConfigured: false,
  async configure() {},
  async getOfferings() { return []; },
  async purchase() { return { status: 'error', message: 'RevenueCat is not configured in this build.' }; },
  async restorePurchases() {
    return {
      originalAppUserId: 'stub',
      activeEntitlements: [],
      activeSubscriptions: [],
      nonSubscriptionTransactionIds: [],
    };
  },
  async getCustomerInfo() {
    return {
      originalAppUserId: 'stub',
      activeEntitlements: [],
      activeSubscriptions: [],
      nonSubscriptionTransactionIds: [],
    };
  },
  async logOut() {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Real implementation (lazy-loaded). Replace the dynamic import with the real
// `react-native-purchases` once it's installed in a dev build.
// ─────────────────────────────────────────────────────────────────────────────

interface ExpoExtra {
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
}

function getApiKey(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  if (Platform.OS === 'ios') return extra.revenueCatIosKey;
  if (Platform.OS === 'android') return extra.revenueCatAndroidKey;
  return undefined;
}

// Returns the react-native-purchases default export when present, else null.
// Typed as `any` because the module is an optional native dep that may not
// be installed in this environment (Expo Go / CI).
async function loadPurchasesSDK(): Promise<any | null> {
  try {
    // @ts-ignore optional native dep, may not be installed
    const mod = await import('react-native-purchases').catch(() => null);
    if (!mod) return null;
    return (mod as any).default ?? mod;
  } catch {
    return null;
  }
}

function normalizeCustomerInfo(raw: any): RCCustomerInfo {
  const entitlements = raw?.entitlements?.active ?? {};
  const activeEntitlements = Object.keys(entitlements);
  const activeSubscriptions: string[] = Array.isArray(raw?.activeSubscriptions)
    ? raw.activeSubscriptions
    : Object.values(entitlements)
        .map((e: any) => e?.productIdentifier)
        .filter(Boolean);
  const nonSubscriptionTransactionIds: string[] = Array.isArray(raw?.nonSubscriptionTransactions)
    ? raw.nonSubscriptionTransactions.map((t: any) => t.transactionIdentifier ?? t.id).filter(Boolean)
    : [];
  return {
    originalAppUserId: raw?.originalAppUserId ?? 'unknown',
    activeEntitlements,
    activeSubscriptions,
    nonSubscriptionTransactionIds,
    managementURL: raw?.managementURL ?? undefined,
  };
}

function normalizeOffering(raw: any): RCOffering | null {
  if (!raw) return null;
  const pkgs = (raw.availablePackages ?? []).map((p: any): RCPackage => ({
    identifier: p.identifier,
    productId: p.product?.identifier ?? p.identifier,
    priceString: p.product?.priceString ?? '',
    title: p.product?.title ?? p.product?.identifier ?? '',
    description: p.product?.description ?? '',
  }));
  return { identifier: raw.identifier, packages: pkgs };
}

function makeReal(sdk: any, apiKey: string): RevenueCatAPI {
  let configured = false;

  return {
    get isConfigured() { return configured; },

    async configure(userId?: string) {
      if (configured) return;
      sdk.configure({ apiKey, appUserID: userId });
      configured = true;
    },

    async getOfferings() {
      const data = await sdk.getOfferings();
      const offerings: RCOffering[] = [];
      const current = normalizeOffering(data?.current);
      if (current) offerings.push(current);
      const all = data?.all ?? {};
      for (const key of Object.keys(all)) {
        if (current && key === current.identifier) continue;
        const o = normalizeOffering(all[key]);
        if (o) offerings.push(o);
      }
      return offerings;
    },

    async purchase(productId) {
      try {
        const offeringsData = await sdk.getOfferings();
        let pkg: any | null = null;
        const search = (off: any) => {
          if (!off) return null;
          return (off.availablePackages ?? []).find((p: any) => p.product?.identifier === productId) ?? null;
        };
        pkg = search(offeringsData?.current);
        if (!pkg && offeringsData?.all) {
          for (const o of Object.values(offeringsData.all)) {
            pkg = search(o);
            if (pkg) break;
          }
        }
        if (!pkg) {
          // Fall back to direct product purchase if the SDK supports it.
          if (typeof sdk.purchaseProduct === 'function') {
            const res = await sdk.purchaseProduct(productId);
            return {
              status: 'success' as const,
              productId,
              transactionId: res?.transactionIdentifier ?? `txn_${Date.now()}`,
              customerInfo: normalizeCustomerInfo(res?.customerInfo),
            };
          }
          return { status: 'error', message: `Product ${productId} not in any offering.` };
        }
        const res = await sdk.purchasePackage(pkg);
        return {
          status: 'success' as const,
          productId,
          transactionId: res?.transactionIdentifier ?? `txn_${Date.now()}`,
          customerInfo: normalizeCustomerInfo(res?.customerInfo),
        };
      } catch (e: any) {
        if (e?.userCancelled) return { status: 'cancelled' as const };
        if (e?.code === 'PURCHASE_NOT_ALLOWED_ERROR') return { status: 'error' as const, message: 'Purchases are not allowed on this device.' };
        if (e?.code === 'PAYMENT_PENDING_ERROR') return { status: 'pending' as const };
        return { status: 'error' as const, message: e?.message ?? 'Purchase failed.' };
      }
    },

    async restorePurchases() {
      const raw = await sdk.restorePurchases();
      return normalizeCustomerInfo(raw);
    },

    async getCustomerInfo() {
      const raw = await sdk.getCustomerInfo();
      return normalizeCustomerInfo(raw);
    },

    async logOut() {
      if (typeof sdk.logOut === 'function') await sdk.logOut();
    },
  };
}

let cached: RevenueCatAPI | null = null;

export async function getRevenueCat(): Promise<RevenueCatAPI> {
  if (cached) return cached;
  const apiKey = getApiKey();
  if (!apiKey) {
    cached = stub;
    return cached;
  }
  const sdk = await loadPurchasesSDK();
  if (!sdk) {
    cached = stub;
    return cached;
  }
  cached = makeReal(sdk, apiKey);
  await cached.configure();
  return cached;
}

export function __setRevenueCatForTests(api: RevenueCatAPI | null): void {
  cached = api;
}

export const knownProductIds = Object.values(PRODUCT_IDS);
export const monthlyEntitlementId = ENTITLEMENTS.monthly;

export function hasMonthlyFrom(info: RCCustomerInfo): boolean {
  return info.activeEntitlements.includes(monthlyEntitlementId) ||
    info.activeSubscriptions.includes(PRODUCT_IDS.monthly);
}

export function countNewReadingCredits(
  info: RCCustomerInfo,
  alreadyConsumedTransactionIds: string[],
): { credits: number; consumedIds: string[] } {
  const fresh = info.nonSubscriptionTransactionIds.filter(
    (id) => !alreadyConsumedTransactionIds.includes(id),
  );
  return { credits: fresh.length, consumedIds: fresh };
}
