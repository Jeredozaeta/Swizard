import posthog from 'posthog-js';

export const initPostHog = () => {
  posthog.init('phc_Gg6GNGcq9Q5KPCVZqCwWxLB8U2wVCxVwWxJXxkTFhMC', {
    api_host: 'https://app.posthog.com',
    persistence: 'localStorage',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true,
    disable_persistence: false,
    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        posthog.debug();
      }
    }
  });
};

export const identify = (userId: string, traits?: Record<string, any>) => {
  posthog.identify(userId, traits);
};

export const capture = (event: string, properties?: Record<string, any>) => {
  posthog.capture(event, properties);
};

export const isPostHogLoaded = () => {
  return posthog.__loaded;
};