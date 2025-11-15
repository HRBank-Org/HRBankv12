import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

const USER_TYPES = [
  { value: 'workforce', label: 'Workforce' },
  { value: 'employer', label: 'Employer' },
  { value: 'institution', label: 'Institution' }
];

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(true);
  const [selectedUserType, setSelectedUserType] = useState('workforce');
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams] = useSearchParams();

  // Check for OAuth error and set initial user type from URL
  React.useEffect(() => {
    if (searchParams.get('error') === 'google_auth_failed') {
      setError('Google sign-in failed. Please try again or use email/password.');
    }
    
    // Set user type from URL parameter
    const typeParam = searchParams.get('type');
    if (typeParam && ['workforce', 'employer', 'institution'].includes(typeParam)) {
      setSelectedUserType(typeParam);
    }
  }, [searchParams]);

  // Check if Google OAuth is available
  React.useEffect(() => {
    const checkGoogleOAuth = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
        const response = await fetch(`${backendUrl}/api/auth/google/status`);
        const data = await response.json();
        setGoogleAvailable(data.data?.available || false);
      } catch (error) {
        console.error('Failed to check Google OAuth status:', error);
        setGoogleAvailable(false);
      }
    };
    checkGoogleOAuth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try real backend login first
      const response = await login({ email, password });
      const { user_type, profile_status, needs_onboarding } = response.data;
      
      // Check profile status first
      if (profile_status === 'pending') {
        navigate('/pending-approval');
        return;
      }
      
      if (profile_status === 'suspended') {
        setError('Account suspended. Contact support@hrbank.ca');
        setLoading(false);
        return;
      }
      
      // Check if needs onboarding
      if (needs_onboarding) {
        if (user_type === 'employer') {
          navigate('/employer/onboarding');
        } else if (user_type === 'workforce') {
          navigate('/workforce/onboarding');
        }
        return;
      }
      
      // Regular redirect based on user type
      if (user_type === 'workforce') {
        navigate('/workforce/dashboard');
      } else if (user_type === 'employer') {
        navigate('/employer/dashboard');
      } else if (user_type === 'institution') {
        navigate('/institution/dashboard');
      } else if (user_type === 'admin') {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.error?.message || err.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    window.location.href = `${backendUrl}/api/auth/google/login?user_type=${selectedUserType}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: theme.bgColor }}>
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={theme.logo}
            alt="HR Bank Logo"
            className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-lg"
          />
          <h1 className="text-3xl font-bold text-gray-900">Welcome to HR Bank</h1>
          <p className="text-gray-600 mt-2">Sign in to continue</p>
        </div>

        {/* User Type Tabs - Color Coded */}
        <div className="mb-6">
          <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
            {USER_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSelectedUserType(type.value)}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all ${
                  selectedUserType === type.value
                    ? 'text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                }`}
                style={{
                  backgroundColor: selectedUserType === type.value ? theme.primaryColor : 'transparent'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-gray-700">Continue with Google</span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                style={{ focusRingColor: theme.primaryColor }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <Link to="/forgot-password" className="text-sm hover:underline" style={{ color: theme.primaryColor }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold hover:underline" style={{ color: theme.primaryColor }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const [selectedUserType, setSelectedUserType] = useState('workforce');

  return (
    <ThemeProvider key={selectedUserType} userType={selectedUserType}>
      <LoginForm selectedUserType={selectedUserType} setSelectedUserType={setSelectedUserType} />
    </ThemeProvider>
  );
};

export default Login;
