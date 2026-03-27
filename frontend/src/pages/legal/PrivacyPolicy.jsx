import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../../contexts/LanguageContext';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mt-2">Last Updated: November 15, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to HR Bank ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our workforce management platform.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              By using HR Bank, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Personal Information You Provide</h3>
            <p className="text-gray-700 leading-relaxed mb-3">We collect information that you voluntarily provide when you:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Register for an account (name, email, phone number, user type)</li>
              <li>Complete your profile (employment history, skills, certifications, address)</li>
              <li>Upload documents (ID, certifications, business licenses)</li>
              <li>Create or accept shifts and set availability</li>
              <li>Communicate through our platform (messages, notifications)</li>
              <li>Use Google OAuth (email, name, profile photo from Google)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Location Data:</strong> GPS coordinates for workplace check-in/check-out and shift matching</li>
              <li><strong>Usage Data:</strong> IP address, browser type, device information, pages visited</li>
              <li><strong>Cookies:</strong> Authentication tokens, session data, user preferences</li>
              <li><strong>Calendar Data:</strong> Availability blocks, scheduled shifts (synced with Google Calendar if connected)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Google OAuth:</strong> Email, name, profile picture (only when you choose to sign in with Google)</li>
              <li><strong>Google Calendar:</strong> Calendar events (only if you connect your Google Calendar)</li>
              <li><strong>Payment Processors:</strong> Payment transaction data (processed securely by third-party payment providers)</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Create and manage your account</li>
              <li>Match workers with available shifts based on skills, location, and availability</li>
              <li>Process shift bookings, check-ins, and payments</li>
              <li>Verify employment documents and certifications</li>
              <li>Send notifications about shifts, messages, and account updates</li>
              <li>Sync your calendar with Google Calendar (if enabled by you)</li>
              <li>Calculate platform revenue based on hours worked</li>
              <li>Generate analytics for admins and employers</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations and resolve disputes</li>
              <li>Improve our services and develop new features</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Share Your Information</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 With Other Users</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Employers see:</strong> Worker name, profile photo, skills, ratings, availability, distance from workplace</li>
              <li><strong>Workers see:</strong> Employer name, workplace address, shift details, hourly rate</li>
              <li><strong>We NEVER share:</strong> Full contact details (email, phone, home address) between parties until after shift acceptance</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 With Service Providers</h3>
            <p className="text-gray-700 leading-relaxed mb-3">We share information with trusted third parties who help us operate our platform:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Cloud hosting providers (for data storage)</li>
              <li>Payment processors (for secure transactions)</li>
              <li>Email service providers (for notifications)</li>
              <li>Google (for OAuth authentication and Calendar sync, only if you enable it)</li>
              <li>Analytics providers (for platform improvement)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 For Legal Reasons</h3>
            <p className="text-gray-700 leading-relaxed">
              We may disclose your information if required by law, court order, or government request, or to protect our rights, safety, or property.
            </p>
          </section>

          {/* Google OAuth and Calendar */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Google Integration</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.1 Google Sign-In (OAuth)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              When you choose to sign in with Google, we receive your email, name, and profile photo from Google. We use this information solely to create and authenticate your HR Bank account. We do not access any other data from your Google account.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.2 Google Calendar Sync</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you choose to connect your Google Calendar:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>We sync your HR Bank availability and shifts to your Google Calendar</li>
              <li>We can read your Google Calendar to detect scheduling conflicts</li>
              <li>You can disconnect at any time from Settings → Google Calendar</li>
              <li>We only access calendar data you explicitly authorize</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              <strong>HR Bank's use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</strong>
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>JWT-based authentication with token refresh</li>
              <li>Role-based access control</li>
              <li>Regular security audits and updates</li>
              <li>Secure storage of uploaded documents</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Disconnect:</strong> Disconnect Google Calendar sync at any time</li>
              <li><strong>Data Portability:</strong> Request your data in a portable format</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              To exercise these rights, contact us at <a href="mailto:privacy@hrbank.ca" className="text-blue-600 hover:underline">privacy@hrbank.ca</a>
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for legal, tax, or regulatory purposes for up to 7 years.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              HR Bank is not intended for users under 18 years of age. We do not knowingly collect information from children. If you believe a child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          {/* International Users */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              HR Bank is based in Canada. If you access our services from outside Canada, your information may be transferred to and processed in Canada, where data protection laws may differ from your jurisdiction.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a prominent notice on our platform. Your continued use after changes indicates acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you have questions about this Privacy Policy or our data practices:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-700"><strong>HR Bank</strong></p>
              <p className="text-gray-700">Email: <a href="mailto:privacy@hrbank.ca" className="text-blue-600 hover:underline">privacy@hrbank.ca</a></p>
              <p className="text-gray-700">Support: <a href="mailto:support@hrbank.ca" className="text-blue-600 hover:underline">support@hrbank.ca</a></p>
              <p className="text-gray-700">Address: Toronto, Ontario, Canada</p>
            </div>
          </section>

        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">
            © 2025 HR Bank. All rights reserved. | 
            <a href="/terms" className="ml-2 hover:text-white">Terms of Service</a> | 
            <a href="/privacy" className="ml-2 hover:text-white">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
