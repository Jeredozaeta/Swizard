import * as Sentry from '@sentry/react';
import posthog from '@posthog/browser';

// Initialize PostHog
export const initPostHog = () => {
  if (import.meta.env.PROD) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
      persistence: 'localStorage',
      autocapture: false,
      capture_pageview: true,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true
    });
  }
};

// Initialize Sentry
export const initSentry = () => {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.01,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE
    });
  }
};

// Analytics event tracking
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    posthog.capture(eventName, properties);
  }
};

// Error tracking
export const trackError = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context
    });
  }
};

// Get analytics status
export const getAnalyticsStatus = () => ({
  posthog: {
    enabled: import.meta.env.PROD && !!import.meta.env.VITE_POSTHOG_KEY,
    sessionId: posthog.get_session_id(),
    distinctId: posthog.get_distinct_id()
  },
  sentry: {
    enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
    lastEventId: Sentry.lastEventId()
  }
});