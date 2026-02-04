import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const userType = searchParams.get('user_type');
        const errorParam = searchParams.get('error');

        console.log('[GoogleCallback] Received params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          userType,
          error: errorParam 
        });

        if (errorParam) {
          setError(errorParam === 'google_auth_failed' 
            ? 'Google authentication failed. Please try again.' 
            : errorParam);
          setProcessing(false);
          return;
        }

        if (!accessToken || !refreshToken) {
          setError('No authentication tokens received');
          setProcessing(false);
          return;
        }

        // Store tokens
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        
        // Decode the JWT to get user info (without verification - just for display)
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const userData = {
            user_id: payload.user_id,
            email: payload.email,
            user_type: payload.user_type || userType
          };
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('[GoogleCallback] User data stored:', userData);
        } catch (decodeError) {
          console.warn('[GoogleCallback] Could not decode token:', decodeError);
        }

        // Determine redirect URL
        const redirectMap = {
          workforce: '/workforce/dashboard',
          employer: '/employer/dashboard',
          institution: '/institution/dashboard',
          workpassport: '/workpassport/dashboard'
        };
        
        const redirectUrl = redirectMap[userType] || '/';
        console.log('[GoogleCallback] Redirecting to:', redirectUrl);

        // Use window.location.href for a clean redirect with full page reload
        // This ensures AuthContext re-initializes with the new tokens
        window.location.href = redirectUrl;

      } catch (err) {
        console.error('[GoogleCallback] Error:', err);
        setError('Authentication failed. Please try again.');
        setProcessing(false);
      }
    };

    handleCallback();
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
            data-testid="google-callback-back-btn"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing Google Sign-In...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait while we set up your account</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
