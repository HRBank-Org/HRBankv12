import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LinkedInCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get('token');
        const redirect = searchParams.get('redirect') || '/workpassport/dashboard';
        const errorParam = searchParams.get('error');

        console.log('[LinkedInCallback] Received params:', { 
          hasToken: !!token, 
          redirect,
          error: errorParam 
        });

        if (errorParam) {
          setError(errorParam);
          setProcessing(false);
          return;
        }

        if (!token) {
          setError('No authentication token received');
          setProcessing(false);
          return;
        }

        // Store token
        localStorage.setItem('access_token', token);
        
        // Decode token to get user info
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userData = {
            user_id: payload.user_id,
            email: payload.email,
            user_type: payload.user_type
          };
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('[LinkedInCallback] User data stored:', userData);
        } catch (decodeError) {
          console.warn('[LinkedInCallback] Could not decode token:', decodeError);
        }

        console.log('[LinkedInCallback] Redirecting to:', redirect);
        
        // Use window.location.href for a clean redirect with full page reload
        // This ensures AuthContext re-initializes with the new tokens
        window.location.href = redirect;

      } catch (err) {
        console.error('[LinkedInCallback] Error:', err);
        setError('Authentication failed. Please try again.');
        setProcessing(false);
      }
    };

    processCallback();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="linkedin-callback-back-btn"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold mb-2">Completing LinkedIn Sign-In...</h2>
        <p className="text-white/70">Please wait while we set up your account</p>
      </div>
    </div>
  );
};

export default LinkedInCallback;
