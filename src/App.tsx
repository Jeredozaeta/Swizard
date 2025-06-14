import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import MainContent from './components/MainContent';
import Success from './components/Success';
import AdminLogin from './components/AdminLogin';
import AuthPage from './components/Auth';
import AuthCallback from './components/AuthCallback';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Licensing from './pages/Licensing';
import Science from './pages/Science';
import ErrorBoundary from './components/ErrorBoundary';
import LegalDisclaimer from './components/LegalDisclaimer';
import AdminMiniPanel from './components/AdminMiniPanel';
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
              <div className="relative">
                <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#030014] to-transparent">
                  <LegalDisclaimer />
                </div>
                <div>
                  <Routes>
                    <Route path="/" element={<Navigate to="/app" replace />} />
                    <Route path="/app" element={<MainContent />} />
                    <Route path="/app/preset/:id" element={<MainContent />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    {/* Handle Supabase OAuth callback route */}
                    <Route path="/auth/v1/callback" element={<AuthCallback />} />
                    <Route path="/success" element={<Success />} />
                    <Route path="/admin-login" element={<AdminLogin />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/licensing" element={<Licensing />} />
                    <Route path="/science" element={<Science />} />
                    <Route path="*" element={<Navigate to="/app" replace />} />
                  </Routes>
                </div>
                {/* Global Admin Mini Panel */}
                <AdminMiniPanel />
              </div>
              <ToastContainer position="bottom-right" theme="dark" />
            </AudioProvider>
          </StripeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;