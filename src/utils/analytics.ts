import posthog from 'posthog-js';

export const initPostHog = () => {
  posthog.init('phc_YC9GSDcq9NDOxuPgeBYFstH2W77GvHHkfPmFM47ZJiZ', {
    api_host: 'https://app.posthog.com',
    autocapture: true,
    capture_pageview: true,
    persistence: 'localStorage',
    bootstrap: {
      distinctId: localStorage.getItem('ph_distinct_id'),
      isIdentifiedByDefault: false
    }
  });
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  posthog.identify(userId, traits);
};

export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  posthog.capture(eventName, properties);
};

export const setUserProperties = (properties: Record<string, any>) => {
  posthog.people.set(properties);
};

export const resetAnalytics = () => {
  posthog.reset();
};