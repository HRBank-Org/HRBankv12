import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

import { useLanguage } from '../../contexts/LanguageContext';

const PendingApproval = () => {
  const { user, logout, refreshUser } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Check if user status has changed (e.g., admin activated the account)
  useEffect(() => {
    const checkStatus = async () => {
      if (refreshUser) {
        await refreshUser();
      }
      
      if (user?.profile_status === 'active') {
        // Redirect to appropriate dashboard
        const redirectMap = {
          workforce: '/workforce/dashboard',
          employer: '/employer/home',
          institution: '/institution/dashboard',
          workpassport: '/workpassport/dashboard',
          admin: '/admin/super-dashboard',
          super_admin: '/admin/super-dashboard'
        };
        navigate(redirectMap[user.user_type] || '/');
      }
    };
    
    // Check immediately and then every 30 seconds
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [user, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: theme.bgColor }}>
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <img src={theme.logo} alt="HR Bank" className="w-20 h-20 mx-auto mb-6 rounded-2xl" />
          
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Pending Approval</h2>
          
          <p className="text-gray-600 mb-6">
            Thank you for signing up with HR Bank! Your account is currently under review by our admin team.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">What's Happening?</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span>Our admin team is reviewing your account information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>We'll call you at your registered phone number to verify your identity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Once verified, we'll activate your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">4.</span>
                <span>You'll receive an email confirmation when your account is ready</span>
              </li>
            </ol>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Approval usually takes:</strong> 4-24 hours during business days
            </p>
          </div>

          <div className="text-sm text-gray-600 mb-6">
            <p>Questions? Contact us at <a href="mailto:support@hrbank.ca" className="hover:underline" style={{ color: theme.primaryColor }}>support@hrbank.ca</a></p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={async () => {
                if (refreshUser) {
                  await refreshUser();
                }
                window.location.reload();
              }}
              className="px-6 py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Check Status
            </button>
            <button
              onClick={logout}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
