import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Terms: React.FC = () => {
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
            Terms of Service
          </h1>

          <div className="prose prose-invert prose-purple max-w-none">
            <p className="text-violet-200/90 mb-8">
              Please read these Terms of Service ("Terms") carefully before using Swizard ("the Service") operated by Swizard ("we," "us," or "our").
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">1. Acceptance of Terms</h2>
              <p className="text-violet-200/90">
                By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">2. Subscription Terms</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  2.1. Subscription fees are billed in advance on a monthly or six-month basis.
                </p>
                <p>
                  2.2. You authorize us to charge your payment method for all applicable fees.
                </p>
                <p>
                  2.3. Subscriptions automatically renew unless cancelled at least 24 hours before the renewal date.
                </p>
                <p>
                  2.4. Refunds are handled in accordance with our refund policy and applicable law.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">3. User Responsibilities</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  3.1. You are responsible for maintaining the confidentiality of your account.
                </p>
                <p>
                  3.2. You must not use the Service for any illegal or unauthorized purpose.
                </p>
                <p>
                  3.3. You agree not to attempt to circumvent any security features of the Service.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">4. Intellectual Property</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  4.1. The Service and its original content, features, and functionality are owned by Swizard and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
                <p>
                  4.2. Pro subscribers receive a license to use exported audio files commercially, subject to our licensing terms.
                </p>
                <p>
                  4.3. Free users may only use exported audio for personal, non-commercial purposes.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">5. Usage Restrictions</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  5.1. You may not redistribute, sell, or lease any part of the Service.
                </p>
                <p>
                  5.2. You may not reverse engineer or attempt to extract the source code of the Service.
                </p>
                <p>
                  5.3. You may not use the Service to generate content that infringes on third-party rights.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">6. Account Termination</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  6.1. We reserve the right to terminate or suspend access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
                </p>
                <p>
                  6.2. Upon termination, your right to use the Service will immediately cease.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">7. Limitation of Liability</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  7.1. In no event shall Swizard, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
                <p>
                  7.2. Our liability is limited to the maximum extent permitted by law.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">8. Disclaimers</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  8.1. The Service is provided "as is" and "as available" without any warranty of any kind.
                </p>
                <p>
                  8.2. We do not guarantee that the Service will be uninterrupted, timely, secure, or error-free.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">9. Governing Law</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  9.1. These Terms shall be governed by and construed in accordance with the laws of the United States.
                </p>
                <p>
                  9.2. Any disputes shall be subject to the exclusive jurisdiction of the courts in the United States.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-violet-300 mb-4">10. Changes to Terms</h2>
              <div className="text-violet-200/90 space-y-4">
                <p>
                  10.1. We reserve the right to modify or replace these Terms at any time.
                </p>
                <p>
                  10.2. Material changes will be notified to users at least 30 days before they become effective.
                </p>
                <p>
                  10.3. Continued use of the Service after changes constitutes acceptance of the new Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-violet-300 mb-4">11. Contact Information</h2>
              <p className="text-violet-200/90">
                For any questions about these Terms, please contact us at hello@realsoundwizard.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;