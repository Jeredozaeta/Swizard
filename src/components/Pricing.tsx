import React, { useState, useEffect } from 'react';
import { useStripe } from '../context/StripeContext';
import { toast } from 'react-toastify';
import { Sparkles, Zap, Crown, ArrowRight, Check, ChevronDown, ChevronUp, Minus, ArrowLeft, Clock, Star, Rocket, Shield } from 'lucide-react';
import { STRIPE_PRODUCTS, ProductId } from '../stripe-config';
import { supabase } from '../lib/supabase';

interface PricingProps {
  onClose: () => void;
}

const plans = [
  {
    name: 'Free Plan',
    price: '$0',
    period: 'forever',
    priceId: 'free_plan',
    description: 'Start your sound journey',
    features: [
      'Basic frequency generator',
      'Standard waveform visualizer',
      '3 starter presets',
      'Preview-quality WAV export',
      'No credit card required'
    ],
    cta: 'Create Your First Sound Now',
    ctaIcon: Sparkles,
    ctaColor: 'bg-transparent border border-violet-500/30 hover:bg-violet-500/10 text-violet-300'
  },
  {
    name: 'Pro Monthly',
    price: '$22',
    period: '/month',
    priceId: STRIPE_PRODUCTS.monthly.priceId,
    description: 'Unlock your full creative potential',
    popular: true,
    featureGroups: [
      {
        title: 'Creativity Tools',
        icon: Star,
        features: [
          '14+ studio-grade effects',
          'Real-time waveform sculpting',
          'Unlimited custom presets'
        ]
      },
      {
        title: 'Professional Control',
        icon: Shield,
        features: [
          'Advanced parameter control',
          'Enhanced audio fidelity',
          'Customizable effect chains'
        ]
      },
      {
        title: 'Monetization',
        icon: Rocket,
        features: [
          'HD WAV + MP4 export',
          'Commercial use license',
          'Priority support'
        ]
      }
    ],
    cta: 'Unlock With Pro',
    ctaSubtext: 'Best for creators getting started • Cancel anytime',
    ctaIcon: Zap,
    ctaColor: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white'
  },
  {
    name: 'Pro 6-Month',
    price: '$88',
    period: 'every 6 months',
    priceId: STRIPE_PRODUCTS.yearly.priceId,
    description: 'Maximum value. Early access. Ultimate freedom.',
    savings: 'Save 33%',
    features: [
      'Everything in Monthly plan',
      'Early access to AI features',
      'Priority feature unlocks',
      'Premium preset templates',
      'One-time payment'
    ],
    cta: 'Go All In – Save 33%',
    ctaSubtext: 'Best value • Ideal for long-term sound monetizers',
    ctaIcon: Crown,
    ctaColor: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
  }
];

const Pricing: React.FC<PricingProps> = ({ onClose }) => {
  const { createCheckoutSession } = useStripe();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    status: string;
    currentPeriodEnd: number | null;
  } | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: subscriptions, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('subscription_status, current_period_end');

        if (error) {
          console.error('Error checking subscription:', error);
          return;
        }

        const activeSubscription = subscriptions?.find(sub => 
          sub.subscription_status === 'active' || 
          sub.subscription_status === 'trialing'
        );

        if (activeSubscription) {
          setHasSubscription(true);
          setSubscriptionDetails({
            status: activeSubscription.subscription_status,
            currentPeriodEnd: activeSubscription.current_period_end
          });
        } else {
          setHasSubscription(false);
          setSubscriptionDetails(null);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, []);

  const handlePlanSelect = async (priceId: string) => {
    if (priceId === 'free_plan') {
      onClose();
      return;
    }

    if (hasSubscription) {
      toast.info('You already have an active subscription!', {
        icon: '⭐'
      });
      return;
    }

    try {
      setLoading(true);
      setSelectedPlan(priceId);
      
      const { data, error } = await createCheckoutSession(priceId);
      
      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to start checkout. Please try again.');
        return;
      }

      if (!data?.url) {
        console.error('Missing checkout URL');
        toast.error('Invalid checkout response');
        return;
      }

      window.open(data.url, '_blank', 'noopener,noreferrer');
      
      toast.info('Checkout opened in a new tab. Complete your purchase to unlock Pro features!', {
        autoClose: 10000
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to App
          </button>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            {hasSubscription ? 'Your Pro Subscription' : 'Start Creating in Seconds'}
          </h2>
        </div>

        {hasSubscription && subscriptionDetails && (
          <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-violet-200 mb-2">
                  You're a Pro Creator! 🎉
                </h3>
                <p className="text-violet-300">
                  All Pro features are unlocked and ready to use.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-violet-300">
                <Clock className="h-4 w-4" />
                <span>Renews: {formatDate(subscriptionDetails.currentPeriodEnd)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 md:space-y-0 md:flex md:gap-4">
          {plans.map((plan, index) => {
            const Icon = plan.ctaIcon;
            const isSelected = selectedPlan === plan.priceId;
            const isDisabled = hasSubscription && plan.priceId !== 'free_plan';
            
            return (
              <div
                key={plan.name}
                className={`w-full md:w-1/3 ${
                  plan.popular ? 'order-first md:order-none' : ''
                }`}
              >
                <div
                  className={`relative h-full rounded-xl border transition-all duration-300 ${
                    plan.popular
                      ? 'border-violet-500/50 bg-gradient-to-b from-violet-900/20 to-fuchsia-900/20 scale-100 md:scale-[1.02] shadow-lg shadow-violet-500/20'
                      : 'border-violet-500/20 bg-gradient-to-b from-[#1a0b2e]/40 to-[#0f0720]/40'
                  } p-6`}
                >
                  {plan.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-0.5 rounded-full text-xs font-medium text-white shadow-lg">
                      Most Popular • Cancel Anytime
                    </div>
                  )}
                  {plan.savings && (
                    <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-0.5 rounded-full text-xs font-medium text-white shadow-lg">
                      {plan.savings}
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-violet-200">{plan.price}</span>
                      <span className="text-violet-300/70 text-sm">{plan.period}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-violet-300 mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-violet-200/80 text-sm">
                      {plan.description}
                    </p>
                  </div>

                  {plan.featureGroups ? (
                    <div className="space-y-6 mb-6">
                      {plan.featureGroups.map((group, idx) => {
                        const GroupIcon = group.icon;
                        return (
                          <div key={idx}>
                            <div className="flex items-center gap-2 mb-2">
                              <GroupIcon className="h-4 w-4 text-violet-400" />
                              <h4 className="text-sm font-semibold text-violet-300">{group.title}</h4>
                            </div>
                            <ul className="space-y-2">
                              {group.features.map((feature, featureIdx) => (
                                <li key={featureIdx} className="flex items-center gap-2 text-sm text-violet-200/90">
                                  <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-violet-200/90">
                          <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-auto">
                    <button
                      onClick={() => handlePlanSelect(plan.priceId)}
                      disabled={loading || isSelected || isDisabled}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 w-full ${
                        plan.ctaColor
                      } ${(loading || isSelected || isDisabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>
                        {isSelected ? 'Opening Checkout...' : 
                         isDisabled ? 'Already Subscribed' : 
                         plan.cta}
                      </span>
                      {!isSelected && !isDisabled && <ArrowRight className="h-4 w-4" />}
                    </button>
                    {plan.ctaSubtext && (
                      <p className="text-center text-violet-300/60 text-xs mt-2">
                        {plan.ctaSubtext}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-violet-300/60 text-xs mt-6">
          You can switch or cancel your plan anytime. All payments secure and encrypted.
        </p>
      </div>
    </div>
  );
};

export default Pricing;