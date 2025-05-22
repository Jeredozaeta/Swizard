import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Privacy: React.FC = () => {
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

        <div className="bg-[#1a0b2e]/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-invert prose-purple max-w-none">
            <p className="text-violet-200/90 mb-8">
              At Swizard, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">1. Information We Collect</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>We collect the following types of information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Account information (email, name)</li>
                  <li>Payment information (processed securely by Stripe)</li>
                  <li>Usage data and analytics</li>
                  <li>Technical information (browser type, device info)</li>
                  <li>Cookies and similar technologies</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">2. How We Use Your Information</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and maintain the Service</li>
                  <li>Process payments and subscriptions</li>
                  <li>Send transactional emails via Postmark</li>
                  <li>Improve and optimize our Service</li>
                  <li>Detect and prevent fraud</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">3. Data Sharing and Third Parties</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  We do not sell or rent your personal information. We share data only with trusted service providers who help us operate our service:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Stripe (payment processing)</li>
                  <li>Postmark (email delivery)</li>
                  <li>Supabase (database and authentication)</li>
                </ul>
                <p>
                  These providers are bound by strict confidentiality agreements and may only use your data to provide services to us.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">4. Your Rights and Choices</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Export your data in a portable format</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">5. Data Security</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  We implement appropriate technical and organizational security measures to protect your data, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption in transit and at rest</li>
                  <li>Regular security assessments</li>
                  <li>Access controls and authentication</li>
                  <li>Secure data backups</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">6. Cookies and Tracking</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  We use cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain your session</li>
                  <li>Remember your preferences</li>
                  <li>Analyze usage patterns</li>
                  <li>Improve our Service</li>
                </ul>
                <p>
                  You can control cookie settings through your browser preferences.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">7. Children's Privacy</h2>
              <p className="text-violet-200/90">
                Our Service is not intended for children under 13. We do not knowingly collect or maintain information from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">8. Changes to This Policy</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Posting the new policy on our website</li>
                  <li>Sending an email to registered users</li>
                  <li>Displaying a notice in our Service</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-violet-300 mb-4">9. Contact Us</h2>
              <p className="text-violet-200/90">
                If you have questions about this Privacy Policy, please contact us at hello@realsoundwizard.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;