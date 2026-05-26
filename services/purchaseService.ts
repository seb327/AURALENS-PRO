// Domain-level purchase service. Sits on top of revenueCatService and turns
// raw RC outcomes into the credit/entitlement model the rest of the app uses.

import {
  getRevenueCat,
  hasMonthlyFrom,
  countNewReadingCredits,
  type RCCustomerInfo,
  type RCOffering,
  type PurchaseOutcome,
} from './revenueCatService';
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
  | { kind: 'error'; message: string };

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
    const rc = await getRevenueCat();
    if (!rc.isConfigured) {
      // Local dev: synthesize a deterministic mock outcome so the rest of the
      // app can be exercised without StoreKit/Play Billing.
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
