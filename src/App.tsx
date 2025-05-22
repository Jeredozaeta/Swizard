import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import MainContent from './components/MainContent';
import Success from './components/Success';
import AdminLogin from './components/AdminLogin';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Licensing from './pages/Licensing';
import Science from './pages/Science';
import ErrorBoundary from './components/ErrorBoundary';
import { AudioProvider } from './context/AudioContext';
import { StripeProvider } from './context/StripeContext';
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <StripeProvider>
            <AudioProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/app" element={<MainContent />} />
                <Route path="/app/preset/:id" element={<MainContent />} />
                <Route path="/success" element={<Success />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/licensing" element={<Licensing />} />
                <Route path="/science" element={<Science />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AudioProvider>
          </StripeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;