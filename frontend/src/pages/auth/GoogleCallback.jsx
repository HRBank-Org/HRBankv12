import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleCallback = () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const userType = searchParams.get('user_type');

      if (accessToken && refreshToken) {
        // Store tokens
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        
        // Redirect to appropriate dashboard
        if (userType === 'workforce') {
          navigate('/workforce/dashboard');
        } else if (userType === 'employer') {
          navigate('/employer/dashboard');
        } else if (userType === 'institution') {
          navigate('/institution/dashboard');
        } else {
          navigate('/');
        }
        
        // Reload to update auth context
        window.location.reload();
      } else {
        // Error occurred
        navigate('/login?error=google_auth_failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing Google Sign-In...</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
