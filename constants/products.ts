// Product IDs match App Store Connect and Play Console exactly.
// Entitlement identifiers match RevenueCat dashboard configuration.

export const PRODUCT_IDS = {
  singleReading: 'auralens_instant_reading_199',
  monthly: 'auralens_monthly_799',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export const ENTITLEMENTS = {
  monthly: 'monthly',
  // Consumable reading credits are tracked locally; RevenueCat reports the
  // *transaction*, the app converts each non-subscription transaction into +1 credit.
  singleReadingTransactionType: 'auralens_instant_reading_199',
} as const;

export interface ProductDescriptor {
  id: ProductId;
  kind: 'consumable' | 'subscription';
  fallbackPrice: string;
  unlock: string;
}

export const PRODUCT_CATALOG: Record<'single' | 'monthly', ProductDescriptor> = {
  single: {
    id: PRODUCT_IDS.singleReading,
    kind: 'consumable',
    fallbackPrice: '£1.99',
    unlock: '1 aura reading credit',
  },
  monthly: {
    id: PRODUCT_IDS.monthly,
    kind: 'subscription',
    fallbackPrice: '£7.99/month',
    unlock: 'Unlimited readings, timeline, comparison, AI Buddy',
  },
};
