import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

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
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-sm text-gray-600 mt-2">Last Updated: November 15, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Agreement to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using HR Bank ("Platform", "Service", "we", "us", "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              These Terms constitute a legally binding agreement between you and HR Bank. We reserve the right to modify these Terms at any time. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              HR Bank is a multi-tenant workforce management platform that connects:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Workforce:</strong> Individuals seeking flexible work opportunities</li>
              <li><strong>Employers:</strong> Businesses seeking to hire workers for shifts</li>
              <li><strong>Institutions:</strong> Organizations issuing credentials and certifications</li>
              <li><strong>Admins:</strong> Platform administrators managing users and operations</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              The Platform facilitates shift scheduling, worker-employer matching, calendar management, document verification, payments, and related workforce management services.
            </p>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration and Eligibility</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Eligibility</h3>
            <p className="text-gray-700 leading-relaxed mb-3">To use HR Bank, you must:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Not be prohibited from using the Service under applicable laws</li>
              <li>Provide accurate, current, and complete information during registration</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Account Security</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You are responsible for all activities under your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>You may not share your account with others or transfer your account</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Account Verification</h3>
            <p className="text-gray-700 leading-relaxed">
              We may require identity verification, background checks, or document validation before granting full access to certain features. Failure to provide requested verification may result in account suspension.
            </p>
          </section>

          {/* User Obligations */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. User Obligations and Conduct</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Prohibited Activities</h3>
            <p className="text-gray-700 leading-relaxed mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Provide false, misleading, or fraudulent information</li>
              <li>Impersonate another person or entity</li>
              <li>Harass, threaten, or discriminate against other users</li>
              <li>Post inappropriate, offensive, or illegal content</li>
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Attempt to hack, reverse engineer, or disrupt the Platform</li>
              <li>Use automated tools (bots, scrapers) without authorization</li>
              <li>Circumvent payments or fees owed through the Platform</li>
              <li>Create multiple accounts to manipulate the system</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Workforce Obligations</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Arrive on time and complete accepted shifts professionally</li>
              <li>Check in/out accurately using the Platform's geolocation system</li>
              <li>Maintain accurate availability calendars</li>
              <li>Provide truthful skills, certifications, and employment history</li>
              <li>Notify employers promptly if unable to fulfill a shift</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Employer Obligations</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Provide accurate shift details, workplace addresses, and compensation</li>
              <li>Comply with employment laws and regulations</li>
              <li>Pay workers promptly for completed shifts</li>
              <li>Maintain a safe work environment</li>
              <li>Not discriminate based on protected characteristics</li>
            </ul>
          </section>

          {/* Payment and Fees */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Payments, Fees, and Revenue Model</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.1 Platform Fees</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              HR Bank charges a platform fee of <strong>$2 per hour worked</strong> ($1 from workforce + $1 from employer) for each completed shift. This fee is automatically calculated based on:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Shift start and end times as recorded by check-in/check-out</li>
              <li>Actual hours worked, not scheduled hours</li>
              <li>Payment is processed automatically upon shift completion</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.2 Payment Terms</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Workers receive payment for completed shifts minus platform fees</li>
              <li>Employers are charged for hours worked plus platform fees</li>
              <li>Payments are processed through secure third-party payment processors</li>
              <li>Refunds are subject to our Refund Policy (contact support)</li>
              <li>All fees are in Canadian Dollars (CAD) unless otherwise stated</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.3 Payment Disputes</h3>
            <p className="text-gray-700 leading-relaxed">
              Disputes regarding hours worked, shift completion, or payments must be reported within 7 days. We will investigate and resolve disputes based on check-in/check-out records, GPS data, and other available evidence.
            </p>
          </section>

          {/* Shift Management */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Shift Scheduling and Management</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.1 Shift Posting and Matching</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Employers post shifts with details including time, location, compensation, and requirements. Our platform automatically matches available workers based on:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Skills and certifications</li>
              <li>Availability (no schedule conflicts)</li>
              <li>Geographic proximity</li>
              <li>Ratings and experience</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.2 Multi-Employer Support</h3>
            <p className="text-gray-700 leading-relaxed">
              Workers can work for multiple employers simultaneously. Once a shift is accepted, that time becomes "locked" and unavailable for booking by other employers to prevent scheduling conflicts.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6.3 Cancellations</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Workers may cancel accepted shifts with reasonable notice (minimum 24 hours recommended)</li>
              <li>Employers may cancel posted shifts before they are accepted</li>
              <li>Repeated cancellations may affect ratings and account standing</li>
              <li>Last-minute cancellations without valid reasons may incur penalties</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property Rights</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.1 Platform Ownership</h3>
            <p className="text-gray-700 leading-relaxed">
              HR Bank and all associated content, features, logos, trademarks, and technology are owned by us or our licensors. You may not copy, modify, distribute, or create derivative works without written permission.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7.2 User Content</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              By uploading content (profile information, documents, photos), you grant HR Bank a worldwide, non-exclusive, royalty-free license to use, display, and distribute that content to provide the Service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of your content and may delete it at any time (subject to legal retention requirements).
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Services</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              HR Bank integrates with third-party services including:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Google OAuth:</strong> For sign-in authentication</li>
              <li><strong>Google Calendar:</strong> For calendar synchronization (optional)</li>
              <li><strong>Payment Processors:</strong> For secure payment processing</li>
              <li><strong>Email Services:</strong> For notifications</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Your use of third-party services is subject to their respective terms and privacy policies. We are not responsible for third-party service actions or failures.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimers and Limitation of Liability</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9.1 Service "As Is"</h3>
            <p className="text-gray-700 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. We do not guarantee uninterrupted, error-free, or secure operation.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9.2 Independent Contractor Relationship</h3>
            <p className="text-gray-700 leading-relaxed">
              HR Bank is a platform connecting workers and employers. We do not employ workers or control employment relationships. Workers are independent contractors of the employers they work for, not employees of HR Bank.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9.3 Limitation of Liability</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, HR BANK SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, revenue, data, or business opportunities</li>
              <li>Actions or omissions of other users (employers, workers)</li>
              <li>Workplace injuries, accidents, or safety incidents</li>
              <li>Payment disputes between employers and workers</li>
              <li>Service interruptions, technical errors, or data loss</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Our total liability for any claim shall not exceed the fees you paid to HR Bank in the 12 months preceding the claim.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">10.1 Termination by You</h3>
            <p className="text-gray-700 leading-relaxed">
              You may delete your account at any time through Settings. Upon deletion, your access to the Service will be terminated, and your data will be removed (subject to legal retention requirements).
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">10.2 Termination by Us</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We may suspend or terminate your account if you:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Violate these Terms or our policies</li>
              <li>Engage in fraudulent, abusive, or illegal conduct</li>
              <li>Fail to pay fees owed</li>
              <li>Pose a risk to other users or the Platform</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              We reserve the right to terminate accounts at our discretion, with or without notice, for any reason.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11.1 Governing Law</h3>
            <p className="text-gray-700 leading-relaxed">
              These Terms are governed by the laws of Ontario, Canada, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11.2 Informal Resolution</h3>
            <p className="text-gray-700 leading-relaxed">
              Before pursuing legal action, you agree to first contact us at <a href="mailto:support@hrbank.ca" className="text-blue-600 hover:underline">support@hrbank.ca</a> to attempt informal resolution.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11.3 Arbitration</h3>
            <p className="text-gray-700 leading-relaxed">
              Any disputes not resolved informally shall be resolved through binding arbitration in Ontario, Canada, under the rules of the Arbitration Act.
            </p>
          </section>

          {/* General Provisions */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. General Provisions</h2>
            
            <ul className="list-disc list-inside text-gray-700 space-y-3 ml-4">
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and HR Bank</li>
              <li><strong>Severability:</strong> If any provision is found invalid, the remaining provisions remain in effect</li>
              <li><strong>No Waiver:</strong> Our failure to enforce a right does not waive that right</li>
              <li><strong>Assignment:</strong> You may not assign these Terms; we may assign them without restriction</li>
              <li><strong>Notices:</strong> Legal notices will be sent to your registered email address</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              For questions about these Terms:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-700"><strong>HR Bank</strong></p>
              <p className="text-gray-700">Email: <a href="mailto:legal@hrbank.ca" className="text-blue-600 hover:underline">legal@hrbank.ca</a></p>
              <p className="text-gray-700">Support: <a href="mailto:support@hrbank.ca" className="text-blue-600 hover:underline">support@hrbank.ca</a></p>
              <p className="text-gray-700">Address: Toronto, Ontario, Canada</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Acknowledgment</h3>
            <p className="text-blue-800 leading-relaxed">
              BY USING HR BANK, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE. IF YOU DO NOT AGREE, PLEASE DO NOT USE THE SERVICE.
            </p>
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

export default TermsOfService;
