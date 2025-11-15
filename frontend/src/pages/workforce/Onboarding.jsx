import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const WorkforceOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold">Welcome to HR Bank!</h1>
            <p className="text-sm opacity-90">Let's complete your profile</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${theme.primaryColor}20` }}>
            <svg className="w-8 h-8" fill="none" stroke={theme.primaryColor} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Created Successfully!</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <strong>Admin Verification Required:</strong>
                <p className="mt-2">
                  Our HR Bank team will review and verify your account before you can start applying for jobs. 
                  We'll call you at <strong>{user?.profile?.phone}</strong> to confirm your details.
                </p>
                <p className="mt-2">
                  You'll receive an email once your account is approved (usually within 24 hours).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-left mb-8">
            <h3 className="font-semibold text-gray-900">What Happens Next?</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">1.</span>
                <span>HR Bank admin reviews your information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">2.</span>
                <span>We'll call you to verify your identity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600">3.</span>
                <span>Once approved, you can complete your profile and start finding work!</span>
              </li>
            </ol>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Back to Login
          </button>
        </div>
      </main>
    </div>
  );
};

export default WorkforceOnboarding;
