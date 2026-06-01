// Domain-level purchase service. Routes to Stripe Checkout by default; the
// RevenueCat path stays available for a future native iOS/Android build but is
// only used when the Railway server URL is NOT configured (legacy/dev mode).

import {
  getRevenueCat,
  hasMonthlyFrom,
  countNewReadingCredits,
  type RCCustomerInfo,
  type RCOffering,
  type PurchaseOutcome,
} from './revenueCatService';
import { stripeService } from './stripeService';
import { PRODUCT_IDS, PRODUCT_CATALOG, type ProductId } from '@/constants/products';

export interface SyncedEntitlement {
  hasMonthly: boolean;
  newReadingCredits: number;     // delta to add to local credit count
  newConsumedIds: string[];      // transaction ids to remember as consumed
  customerId: string;
  activeProductIds: string[];
  managementURL?: string;
}

export type PurchaseResult =
  | { kind: 'success'; productId: ProductId; entitlement: SyncedEntitlement }
  | { kind: 'cancelled' }
  | { kind: 'pending' }
  | { kind: 'redirect'; productId: ProductId; url: string }
  | { kind: 'error'; message: string; requiresSignIn?: boolean };

function toStripeProduct(productId: ProductId): 'single' | 'monthly' {
  return productId === PRODUCT_IDS.monthly ? 'monthly' : 'single';
}

export const purchaseService = {
  async ensureConfigured(): Promise<boolean> {
    const rc = await getRevenueCat();
    return rc.isConfigured;
  },

  async getDisplayOfferings(): Promise<RCOffering[]> {
    const rc = await getRevenueCat();
    if (!rc.isConfigured) return [];
    try {
      return await rc.getOfferings();
    } catch {
      return [];
    }
  },

  async getDisplayPrice(productId: ProductId): Promise<string> {
    const offerings = await this.getDisplayOfferings();
    for (const off of offerings) {
      const pkg = off.packages.find((p) => p.productId === productId);
      if (pkg?.priceString) return pkg.priceString;
    }
    if (productId === PRODUCT_IDS.singleReading) return PRODUCT_CATALOG.single.fallbackPrice;
    if (productId === PRODUCT_IDS.monthly) return PRODUCT_CATALOG.monthly.fallbackPrice;
    return '';
  },

  async purchase(productId: ProductId, previouslyConsumedIds: string[]): Promise<PurchaseResult> {
    // PRIMARY PATH: Stripe Checkout via the Railway server.
    // The mobile/web client never holds the Stripe secret.
    if (stripeService.isConfigured()) {
      const res = await stripeService.createCheckout(toStripeProduct(productId));
      if (!res.ok) {
        return { kind: 'error', message: res.message, requiresSignIn: res.requiresSignIn };
      }
      return { kind: 'redirect', productId, url: res.url };
    }

    // FALLBACK PATH: RevenueCat (only kicks in if the server URL is unset).
    const rc = await getRevenueCat();
    if (!rc.isConfigured) {
      // Local dev with no server URL and no RC: synthesize a deterministic
      // mock outcome so the rest of the app can be exercised offline.
      const mock = buildMockOutcome(productId);
      return {
        kind: 'success',
        productId,
        entitlement: syncedFromOutcome(productId, mock, previouslyConsumedIds),
      };
    }

    const outcome: PurchaseOutcome = await rc.purchase(productId);
    if (outcome.status === 'cancelled') return { kind: 'cancelled' };
    if (outcome.status === 'pending') return { kind: 'pending' };
    if (outcome.status === 'error') return { kind: 'error', message: outcome.message };

    return {
      kind: 'success',
      productId,
      entitlement: syncedFromInfo(outcome.customerInfo, previouslyConsumedIds),
    };
  },

  async restore(previouslyConsumedIds: string[]): Promise<SyncedEntitlement> {
    const rc = await getRevenueCat();
    if (!rc.isConfigured) {
      return {
        hasMonthly: false,
        newReadingCredits: 0,
        newConsumedIds: [],
        customerId: 'local-dev',
        activeProductIds: [],
      };
    }
    const info = await rc.restorePurchases();
    return syncedFromInfo(info, previouslyConsumedIds);
  },

  async syncFromServer(previouslyConsumedIds: string[]): Promise<SyncedEntitlement> {
    const rc = await getRevenueCat();
    if (!rc.isConfigured) {
      return {
        hasMonthly: false,
        newReadingCredits: 0,
        newConsumedIds: [],
        customerId: 'local-dev',
        activeProductIds: [],
      };
    }
    const info = await rc.getCustomerInfo();
    return syncedFromInfo(info, previouslyConsumedIds);
  },
};

function syncedFromInfo(info: RCCustomerInfo, previouslyConsumedIds: string[]): SyncedEntitlement {
  const { credits, consumedIds } = countNewReadingCredits(info, previouslyConsumedIds);
  return {
    hasMonthly: hasMonthlyFrom(info),
    newReadingCredits: credits,
    newConsumedIds: consumedIds,
    customerId: info.originalAppUserId,
    activeProductIds: info.activeSubscriptions,
    managementURL: info.managementURL,
  };
}

function syncedFromOutcome(
  productId: ProductId,
  info: RCCustomerInfo,
  previouslyConsumedIds: string[],
): SyncedEntitlement {
  return syncedFromInfo(info, previouslyConsumedIds);
}

// Mock outcome for Expo Go / dev where the SDK is not configured.
function buildMockOutcome(productId: ProductId): RCCustomerInfo {
  const txnId = `mock_${productId}_${Date.now().toString(36)}`;
  if (productId === PRODUCT_IDS.monthly) {
    return {
      originalAppUserId: 'local-dev',
      activeEntitlements: ['monthly'],
      activeSubscriptions: [PRODUCT_IDS.monthly],
      nonSubscriptionTransactionIds: [],
    };
  }
  return {
    originalAppUserId: 'local-dev',
    activeEntitlements: [],
    activeSubscriptions: [],
    nonSubscriptionTransactionIds: [txnId],
  };
}
