export const STRIPE_PRODUCTS = {
  monthly: {
    priceId: 'price_1RCYzl071jc9XrjqnF2Nw6iA',
    name: 'Pro Monthly',
    description: 'Unlock the full Sound Wizard toolkit',
    mode: 'subscription' as const,
  },
  yearly: {
    priceId: 'price_1RCYzl071jc9XrjqffEQsbEW',
    name: 'Pro Yearly',
    description: 'Max results. Zero friction.',
    mode: 'subscription' as const,
  }
} as const;

export type ProductId = keyof typeof STRIPE_PRODUCTS;