import posthog from 'posthog-js';

// Initialize PostHog with your project API key
export const initPostHog = () => {
  posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    persistence: 'localStorage',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: false,
    enable_recording_console: true,
  });

  // Identify user if authenticated
  const userId = localStorage.getItem('supabase.auth.token');
  if (userId) {
    posthog.identify(userId);
  }

  // Add custom properties to all events
  posthog.register({
    app_version: '1.0.0',
    platform: 'web',
  });
};

// Utility function to capture custom events
export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  posthog.capture(eventName, properties);
};

// Utility function to update user properties
export const updateUserProperties = (properties: Record<string, any>) => {
  posthog.people.set(properties);
};

// Utility function to increment user properties
export const incrementUserProperty = (property: string, value: number = 1) => {
  posthog.people.increment(property, value);
};

// Utility function to track feature flags
export const isFeatureEnabled = (flagKey: string): boolean => {
  return posthog.isFeatureEnabled(flagKey);
};