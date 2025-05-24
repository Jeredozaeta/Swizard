import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Licensing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030014] via-[#1a0b2e] to-[#0f0720] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <span className="text-purple-300">Last Updated: March 21, 2024</span>
          </div>
        </div>

        <div className="bg-[#1a0b2e]/50 rounded-xl border border-purple-500/20 p-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-8">
            Licensing Terms
          </h1>

          <div className="prose prose-invert prose-purple max-w-none">
            <p className="text-violet-200/90 mb-8">
              This document outlines the licensing terms for using Swizard and its outputs. Please read carefully to understand your rights and obligations.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">1. Free Plan License</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>Under the Free Plan:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Personal, non-commercial use only</li>
                  <li>No resale or distribution rights</li>
                  <li>Preview-quality exports only</li>
                  <li>No monetization rights</li>
                  <li>Attribution required for public use</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">2. Pro Plan License</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>Pro Plan subscribers receive:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Commercial use rights for exported audio</li>
                  <li>HD WAV and MP4 export capabilities</li>
                  <li>Monetization rights for created content</li>
                  <li>Unlimited exports and presets</li>
                  <li>No attribution required</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">3. Platform Usage Restrictions</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>The following are strictly prohibited:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Reselling or redistributing Swizard as a platform</li>
                  <li>Reverse engineering the service</li>
                  <li>Creating derivative software products</li>
                  <li>Embedding Swizard in other applications</li>
                  <li>Bypassing security measures</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">4. Intellectual Property Rights</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>Ownership is allocated as follows:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Users own their exported audio files</li>
                  <li>Swizard retains all platform technology rights</li>
                  <li>Pre-made presets remain Swizard property</li>
                  <li>Custom presets belong to their creators</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">5. Commercial Usage</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>Pro subscribers may use exports for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Music production and distribution</li>
                  <li>Meditation and wellness content</li>
                  <li>YouTube and social media content</li>
                  <li>Sound healing practices</li>
                  <li>Educational materials</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">6. AI-Generated Content</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>For AI features (when available):</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Users assume responsibility for outputs</li>
                  <li>No guarantees of uniqueness</li>
                  <li>Commercial rights transfer to users</li>
                  <li>Fair use principles apply</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">7. Legal Compliance</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>Users are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Complying with local laws</li>
                  <li>Obtaining necessary permits</li>
                  <li>Respecting third-party rights</li>
                  <li>Proper content usage</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">8. License Termination</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  Licenses may be terminated for:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Terms of Service violations</li>
                  <li>Payment failures</li>
                  <li>Misuse of the platform</li>
                  <li>Legal compliance issues</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-violet-300 mb-4">9. Contact Information</h2>
              <p className="text-violet-200/90">
                For licensing questions, please contact hello@realsoundwizard.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Licensing;