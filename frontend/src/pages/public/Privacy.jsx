import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database, UserCheck, FileText } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏦</span>
            <span className="font-bold text-xl text-gray-900">HR Bank</span>
          </Link>
          <Link 
            to="/auth/login" 
            className="px-4 py-2 bg-[#30496d] text-white rounded-lg hover:bg-[#243a57] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#30496d] to-[#1a2d47] text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-blue-100">
            Your privacy and data security are our top priorities.
          </p>
          <p className="text-sm text-blue-200 mt-4">Last updated: January 2026</p>
        </div>
      </div>

      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Quick Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-12">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Privacy at a Glance</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Your Data is Encrypted</p>
                  <p className="text-sm text-blue-700">All data transmitted and stored using industry-standard encryption.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">You Control Your Data</p>
                  <p className="text-sm text-blue-700">Choose what's visible on your Work Passport.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">No Data Selling</p>
                  <p className="text-sm text-blue-700">We never sell your personal information.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Policy */}
          <div className="prose prose-lg max-w-none">
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-600" />
                Information We Collect
              </h2>
              <p className="text-gray-600 mb-4">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account.</li>
                <li><strong>Profile Information:</strong> Work history, skills, certifications, and education that you choose to add to your profile.</li>
                <li><strong>Identity Verification:</strong> Government ID and other documents submitted for verification purposes.</li>
                <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we don't store card numbers).</li>
                <li><strong>Communication Data:</strong> Messages sent through our platform and support inquiries.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-600" />
                How We Use Your Information
              </h2>
              <p className="text-gray-600 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Verify your identity and credentials</li>
                <li>Create and maintain your Work Passport</li>
                <li>Record credentials on the blockchain (public, anonymized data only)</li>
                <li>Connect you with employers and job opportunities</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-600" />
                Blockchain & Public Information
              </h2>
              <p className="text-gray-600 mb-4">
                When credentials are verified on the blockchain:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Only credential hashes (not personal details) are stored on-chain</li>
                <li>Your name and personal information remain in our secure database</li>
                <li>Employers can verify credentials without accessing your private data</li>
                <li>You control which credentials appear on your public Work Passport</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-red-600" />
                Data Security
              </h2>
              <p className="text-gray-600 mb-4">
                We implement appropriate technical and organizational measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>256-bit SSL/TLS encryption for all data in transit</li>
                <li>Encrypted storage for sensitive data at rest</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and authentication for all systems</li>
                <li>Secure cloud infrastructure hosted in Canada</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-amber-600" />
                Your Rights & Choices
              </h2>
              <p className="text-gray-600 mb-4">
                You have the following rights regarding your data:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Privacy Controls:</strong> Adjust what appears on your public Work Passport</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="text-gray-700"><strong>Email:</strong> privacy@hrbank.ca</p>
                <p className="text-gray-700"><strong>Address:</strong> HR Bank, Windsor, Ontario, Canada</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
            <Link to="/" className="hover:text-white">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
