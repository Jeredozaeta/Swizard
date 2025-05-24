import React, { useState, useEffect } from 'react';
import { useStripe } from '../context/StripeContext';
import { toast } from 'react-toastify';
import { Sparkles, Zap, Crown, ArrowRight, Check, ChevronDown, ChevronUp, Minus, ArrowLeft, Clock } from 'lucide-react';
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
    description: 'Explore and experiment without limits',
    features: [
      'Core frequency generator',
      'Standard waveform visualizer',
      '3 starter presets',
      'Preview-quality WAV export',
      'No credit card required'
    ],
    cta: 'Try It Instantly',
    ctaIcon: Sparkles,
    ctaColor: 'bg-violet-600/20 hover:bg-violet-600/30 text-violet-300'
  },
  {
    name: 'Pro Monthly',
    price: '$22',
    period: '/month',
    priceId: STRIPE_PRODUCTS.monthly.priceId,
    description: 'Unlock your full creative potential',
    popular: true,
    features: [
      '14+ studio-grade effects',
      'Real-time waveform sculpting',
      'Unlimited custom presets',
      'HD WAV + MP4 export',
      'Cancel anytime'
    ],
    cta: 'Start Creating Like a Pro',
    ctaIcon: Zap,
    ctaColor: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white'
  },
  {
    name: 'Pro Yearly',
    price: '$88',
    period: '/year',
    priceId: STRIPE_PRODUCTS.yearly.priceId,
    description: 'Maximum value. Early access. Ultimate freedom.',
    features: [
      'Everything in Monthly',
      'Early access to AI features',
      'Priority feature unlocks',
      'Premium preset templates',
      'One-time payment'
    ],
    savings: 'Save 60%',
    cta: 'Get the Full Toolkit',
    ctaIcon: Crown,
    ctaColor: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
  }
];

const featureCategories = [
  {
    name: 'Core Features',
    features: [
      {
        name: 'Frequency Generator',
        free: 'Basic',
        pro: 'Advanced',
        yearly: 'Advanced'
      },
      {
        name: 'Waveform Visualizer',
        free: 'Standard',
        pro: 'HD Real-time',
        yearly: 'HD Real-time'
      },
      {
        name: 'Sound Presets',
        free: '3 Basic',
        pro: 'Unlimited',
        yearly: 'Unlimited + Exclusive'
      }
    ]
  },
  {
    name: 'Sound Effects',
    features: [
      {
        name: 'Basic Effects',
        free: '2',
        pro: 'All 14+',
        yearly: 'All 14+'
      },
      {
        name: 'Real-time Sculpting',
        free: false,
        pro: true,
        yearly: true
      },
      {
        name: 'Effect Chaining',
        free: false,
        pro: true,
        yearly: true
      },
      {
        name: 'AI-powered Effects',
        free: false,
        pro: false,
        yearly: 'Early Access'
      }
    ]
  },
  {
    name: 'Export Options',
    features: [
      {
        name: 'WAV Export',
        free: 'Preview Quality',
        pro: 'HD Quality',
        yearly: 'HD Quality'
      },
      {
        name: 'MP4 Export',
        free: false,
        pro: true,
        yearly: true
      },
      {
        name: 'Batch Export',
        free: false,
        pro: true,
        yearly: true
      }
    ]
  },
  {
    name: 'Additional Features',
    features: [
      {
        name: 'Custom Templates',
        free: false,
        pro: '5',
        yearly: 'Unlimited'
      },
      {
        name: 'Share & Embed',
        free: 'Basic Links',
        pro: 'Advanced',
        yearly: 'Advanced'
      },
      {
        name: 'Priority Support',
        free: false,
        pro: true,
        yearly: true
      }
    ]
  }
];

const Pricing: React.FC<PricingProps> = ({ onClose }) => {
  const { createCheckoutSession } = useStripe();
  const [loading, setLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
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

        // Check if there's an active subscription in the results
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

        <div className="relative flex flex-col md:flex-row gap-4 items-stretch justify-center">
          {plans.map((plan, index) => {
            const Icon = plan.ctaIcon;
            const isMiddle = index === 1;
            const isSelected = selectedPlan === plan.priceId;
            const isDisabled = hasSubscription && plan.priceId !== 'free_plan';
            
            return (
              <div
                key={plan.name}
                className={`w-full md:w-1/3 ${
                  isMiddle ? 'md:-mt-4 z-10' : ''
                } transition-all duration-300`}
              >
                <div
                  className={`relative h-full rounded-xl border transition-all duration-300 ${
                    isMiddle
                      ? 'border-violet-500/50 bg-gradient-to-b from-violet-900/20 to-fuchsia-900/20 scale-[1.02] shadow-lg shadow-violet-500/20'
                      : 'border-violet-500/20 bg-gradient-to-b from-[#1a0b2e]/40 to-[#0f0720]/40'
                  } p-6`}
                >
                  {isMiddle && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-0.5 rounded-full text-xs font-medium text-white shadow-lg">
                      Most Popular
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

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-violet-200/90">
                        <Check className="h-4 w-4 text-violet-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

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
                    {plan.priceId !== 'free_plan' && (
                      <p className="text-center text-violet-300/60 text-xs mt-2">
                        Cancel anytime
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center gap-1.5 text-violet-300 hover:text-violet-200 transition-colors text-sm"
          >
            {showComparison ? 'Hide' : 'Compare'} Plans in Detail
            {showComparison ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showComparison && (
            <div className="mt-6 bg-indigo-900/30 rounded-lg border border-violet-500/20 p-4 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-violet-500/20">
                    <th className="py-2 px-4 text-left text-violet-300 font-medium">Features</th>
                    <th className="py-2 px-4 text-center text-violet-300 font-medium">Free</th>
                    <th className="py-2 px-4 text-center text-violet-300 font-medium">Pro Monthly</th>
                    <th className="py-2 px-4 text-center text-violet-300 font-medium">Pro Yearly</th>
                  </tr>
                </thead>
                <tbody>
                  {featureCategories.map((category, categoryIndex) => (
                    <React.Fragment key={category.name}>
                      <tr>
                        <td
                          colSpan={4}
                          className="py-4 px-4 text-sm font-medium text-violet-400"
                        >
                          {category.name}
                        </td>
                      </tr>
                      {category.features.map((feature, featureIndex) => (
                        <tr
                          key={`${categoryIndex}-${featureIndex}`}
                          className="border-t border-violet-500/10"
                        >
                          <td className="py-2 px-4 text-sm text-violet-200">
                            {feature.name}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {renderFeatureValue(feature.free)}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {renderFeatureValue(feature.pro)}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {renderFeatureValue(feature.yearly)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-violet-300/60 text-xs mt-6">
          You can switch or cancel your plan anytime. All payments secure and encrypted.
        </p>
      </div>
    </div>
  );
};

const renderFeatureValue = (value: string | boolean) => {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-5 w-5 text-emerald-400 mx-auto" />
    ) : (
      <Minus className="h-5 w-5 text-violet-500/50 mx-auto" />
    );
  }
  return <span className="text-violet-200">{value}</span>;
};

export default Pricing;