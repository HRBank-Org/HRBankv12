import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';

const THEME_CONFIG = {
  workforce: {
    primaryColor: '#2563eb',
    bgGradient: 'from-blue-600 to-indigo-700',
    label: 'WorkPassport™'
  },
  employer: {
    primaryColor: '#ea580c',
    bgGradient: 'from-orange-500 to-red-600',
    label: 'Employer'
  },
  institution: {
    primaryColor: '#9333ea',
    bgGradient: 'from-purple-600 to-indigo-700',
    label: 'Institution'
  },
  admin: {
    primaryColor: '#dc2626',
    bgGradient: 'from-slate-800 to-slate-900',
    label: 'Admin'
  }
};

const LoginModal = ({ isOpen, onClose, userType = 'workforce' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = THEME_CONFIG[userType] || THEME_CONFIG.workforce;

  // Check if Google OAuth is available (not for admin)
  useEffect(() => {
    if (userType === 'admin') {
      setGoogleAvailable(false);
      return;
    }
    
    const checkGoogleOAuth = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
        const response = await fetch(`${backendUrl}/api/auth/google/status`);
        const data = await response.json();
        setGoogleAvailable(data.data?.available || false);
      } catch (error) {
        console.error('Failed to check Google OAuth status:', error);
        setGoogleAvailable(false);
      }
    };
    checkGoogleOAuth();
  }, [userType]);

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(`hrbank_remembered_email_${userType}`);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, [userType]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Remember email if checkbox is checked
      if (rememberMe) {
        localStorage.setItem(`hrbank_remembered_email_${userType}`, email);
      } else {
        localStorage.removeItem(`hrbank_remembered_email_${userType}`);
      }

      const loginData = userType === 'admin' 
        ? { email, password, user_type: 'admin' }
        : { email, password };

      const response = await login(loginData);
      const { user_type, profile_status, needs_onboarding } = response.data;

      // Admin access check - allow both 'admin' and 'super_admin' user types
      if (userType === 'admin' && user_type !== 'admin' && user_type !== 'super_admin') {
        setError('Access denied. Admin credentials required.');
        setLoading(false);
        return;
      }

      // Check profile status
      if (profile_status === 'pending') {
        navigate('/pending-approval');
        onClose();
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
        onClose();
        return;
      }

      // Regular redirect based on user type
      const redirectMap = {
        workforce: '/workforce/dashboard',
        employer: '/employer/home',
        institution: '/institution/dashboard',
        admin: '/admin/super-dashboard'
      };
      
      navigate(redirectMap[user_type] || '/');
      onClose();
    } catch (err) {
      setError(err.error?.message || err.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    window.location.href = `${backendUrl}/api/auth/google/login?user_type=${userType}`;
  };

  const handleForgotPassword = () => {
    onClose();
    navigate('/forgot-password');
  };

  const handleSignup = () => {
    onClose();
    navigate(`/signup?type=${userType}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        data-testid="login-modal-backdrop"
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        data-testid="login-modal"
      >
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${theme.bgGradient} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {userType === 'admin' ? 'Admin Login' : `Sign In to ${theme.label}`}
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {userType === 'admin' 
                  ? 'Authorized personnel only'
                  : 'Welcome back! Please enter your details'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              data-testid="login-modal-close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          {/* Google Sign-In (not for admin) */}
          {userType !== 'admin' && (
            <>
              <button
                onClick={googleAvailable ? handleGoogleLogin : undefined}
                type="button"
                disabled={!googleAvailable}
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 border-2 rounded-xl transition-colors ${
                  googleAvailable
                    ? 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                }`}
                data-testid="login-google-btn"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className={`font-medium ${googleAvailable ? 'text-gray-700' : 'text-gray-400'}`}>
                  {googleAvailable ? 'Continue with Google' : 'Google Sign-in Unavailable'}
                </span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">or continue with email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm" data-testid="login-error">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none transition-all"
                style={{ '--tw-ring-color': theme.primaryColor }}
                placeholder="you@example.com"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none transition-all"
                  placeholder="••••••••"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 focus:ring-2"
                  style={{ accentColor: theme.primaryColor }}
                  data-testid="login-remember-checkbox"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium hover:underline"
                style={{ color: theme.primaryColor }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.primaryColor }}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign up link (not for admin) */}
          {userType !== 'admin' && (
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Don&apos;t have an account?{' '}
                <button
                  onClick={handleSignup}
                  className="font-semibold hover:underline"
                  style={{ color: theme.primaryColor }}
                >
                  Sign up for free
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
