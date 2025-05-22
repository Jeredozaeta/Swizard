import React, { createContext, useContext } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface StripeContextType {
  createCheckoutSession: (priceId: string) => Promise<{ data?: any; error?: string }>;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

let stripePromise: Promise<Stripe | null>;

export const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getStripe = () => {
    if (!stripePromise) {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        console.error('Missing Stripe publishable key');
        throw new Error('Stripe configuration error');
      }
      stripePromise = loadStripe(publishableKey);
    }
    return stripePromise;
  };

  const createCheckoutSession = async (priceId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (!data.url) {
        throw new Error('Invalid checkout URL');
      }

      return { data };
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      return { error: error.message || 'Failed to start checkout process' };
    }
  };

  return (
    <StripeContext.Provider value={{ createCheckoutSession }}>
      {children}
    </StripeContext.Provider>
  );
};

export const useStripe = () => {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};