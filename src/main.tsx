import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PostHogProvider } from '@posthog/posthog-js-react';
import App from './App.tsx';
import './index.css';
import { initPostHog } from './utils/posthog';

// Initialize PostHog
initPostHog();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider>
      <App />
    </PostHogProvider>
  </StrictMode>
);