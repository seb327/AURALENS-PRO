import { __setRevenueCatForTests, type RevenueCatAPI } from '../revenueCatService';
import { purchaseService } from '../purchaseService';
import { PRODUCT_IDS } from '@/constants/products';

function makeFake(over: Partial<RevenueCatAPI> = {}): RevenueCatAPI {
  return {
    isConfigured: true,
    async configure() {},
    async getOfferings() { return []; },
    async purchase(productId) {
      return {
        status: 'success',
        productId,
        transactionId: `txn_${productId}_${Date.now()}`,
        customerInfo: {
          originalAppUserId: 'test-user',
          activeEntitlements: productId === PRODUCT_IDS.monthly ? ['monthly'] : [],
          activeSubscriptions: productId === PRODUCT_IDS.monthly ? [PRODUCT_IDS.monthly] : [],
          nonSubscriptionTransactionIds: productId === PRODUCT_IDS.singleReading
            ? [`txn_single_${Date.now()}_${Math.random()}`]
            : [],
        },
      };
    },
    async restorePurchases() {
      return {
        originalAppUserId: 'test-user',
        activeEntitlements: ['monthly'],
        activeSubscriptions: [PRODUCT_IDS.monthly],
        nonSubscriptionTransactionIds: [],
      };
    },
    async getCustomerInfo() {
      return {
        originalAppUserId: 'test-user',
        activeEntitlements: [],
        activeSubscriptions: [],
        nonSubscriptionTransactionIds: [],
      };
    },
    async logOut() {},
    ...over,
  };
}

afterEach(() => __setRevenueCatForTests(null));

describe('purchaseService', () => {
  it('returns success and credit metadata for a one-off purchase', async () => {
    __setRevenueCatForTests(makeFake());
    const res = await purchaseService.purchase(PRODUCT_IDS.singleReading, []);
    expect(res.kind).toBe('success');
    if (res.kind === 'success') {
      expect(res.entitlement.newReadingCredits).toBe(1);
      expect(res.entitlement.hasMonthly).toBe(false);
      expect(res.entitlement.newConsumedIds.length).toBe(1);
    }
  });

  it('flags monthly entitlement after subscription purchase', async () => {
    __setRevenueCatForTests(makeFake());
    const res = await purchaseService.purchase(PRODUCT_IDS.monthly, []);
    expect(res.kind).toBe('success');
    if (res.kind === 'success') {
      expect(res.entitlement.hasMonthly).toBe(true);
      expect(res.entitlement.newReadingCredits).toBe(0);
    }
  });

  it('does not re-credit known transaction ids on subsequent syncs', async () => {
    const stableTxn = 'txn_stable_1';
    __setRevenueCatForTests(makeFake({
      async getCustomerInfo() {
        return {
          originalAppUserId: 'test-user',
          activeEntitlements: [],
          activeSubscriptions: [],
          nonSubscriptionTransactionIds: [stableTxn],
        };
      },
    }));
    const first = await purchaseService.syncFromServer([]);
    expect(first.newReadingCredits).toBe(1);
    const second = await purchaseService.syncFromServer([stableTxn]);
    expect(second.newReadingCredits).toBe(0);
  });

  it('propagates cancellation', async () => {
    __setRevenueCatForTests(makeFake({
      async purchase() { return { status: 'cancelled' }; },
    }));
    const res = await purchaseService.purchase(PRODUCT_IDS.monthly, []);
    expect(res.kind).toBe('cancelled');
  });

  it('propagates pending', async () => {
    __setRevenueCatForTests(makeFake({
      async purchase() { return { status: 'pending' }; },
    }));
    const res = await purchaseService.purchase(PRODUCT_IDS.singleReading, []);
    expect(res.kind).toBe('pending');
  });

  it('propagates errors', async () => {
    __setRevenueCatForTests(makeFake({
      async purchase() { return { status: 'error', message: 'oh no' }; },
    }));
    const res = await purchaseService.purchase(PRODUCT_IDS.singleReading, []);
    expect(res.kind).toBe('error');
    if (res.kind === 'error') expect(res.message).toBe('oh no');
  });

  it('restore reports monthly entitlement', async () => {
    __setRevenueCatForTests(makeFake());
    const synced = await purchaseService.restore([]);
    expect(synced.hasMonthly).toBe(true);
  });

  it('falls back safely when RevenueCat is not configured (dev mode)', async () => {
    __setRevenueCatForTests({
      isConfigured: false,
      async configure() {},
      async getOfferings() { return []; },
      async purchase() { return { status: 'error', message: 'not configured' }; },
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
    });

    const single = await purchaseService.purchase(PRODUCT_IDS.singleReading, []);
    expect(single.kind).toBe('success');
    if (single.kind === 'success') {
      expect(single.entitlement.newReadingCredits).toBe(1);
    }

    const monthly = await purchaseService.purchase(PRODUCT_IDS.monthly, []);
    expect(monthly.kind).toBe('success');
    if (monthly.kind === 'success') {
      expect(monthly.entitlement.hasMonthly).toBe(true);
    }

    const price = await purchaseService.getDisplayPrice(PRODUCT_IDS.singleReading);
    expect(price).toBe('£1.99');
  });
});

describe('entitlement gating', () => {
  const { canStartReading, canAccessMonthlyFeatures } = require('@/store/entitlementRules');

  it('blocks reading when no credits and no subscription', () => {
    expect(canStartReading({ hasMonthly: false, readingCredits: 0 })).toBe(false);
  });

  it('allows reading with a credit', () => {
    expect(canStartReading({ hasMonthly: false, readingCredits: 1 })).toBe(true);
  });

  it('allows reading with a monthly subscription', () => {
    expect(canStartReading({ hasMonthly: true, readingCredits: 0 })).toBe(true);
  });

  it('blocks timeline / buddy for non-monthly users', () => {
    expect(canAccessMonthlyFeatures({ hasMonthly: false })).toBe(false);
  });

  it('unlocks timeline / buddy for monthly users', () => {
    expect(canAccessMonthlyFeatures({ hasMonthly: true })).toBe(true);
  });
});
