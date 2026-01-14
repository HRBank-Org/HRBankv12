import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { FiArrowLeft } from 'react-icons/fi';

const USER_TYPES = [
  { value: 'workforce', label: 'WorkPassport™' },
  { value: 'employer', label: 'Employer' },
  { value: 'institution', label: 'Institution' }
];

const SignupForm = ({ selectedUserType, setSelectedUserType, applyJobId }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    user_type: selectedUserType,
    full_name: '',
    phone: ''
  });

  // Update formData when selectedUserType changes
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, user_type: selectedUserType }));
  }, [selectedUserType]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupResponse, setSignupResponse] = useState(null);
  const [googleAvailable, setGoogleAvailable] = useState(true);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  // Check if Google OAuth is available
  React.useEffect(() => {
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
  }, []);

  // Store apply_job in localStorage so it persists through email verification
  React.useEffect(() => {
    if (applyJobId) {
      localStorage.setItem('pending_job_application', applyJobId);
    }
  }, [applyJobId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Format phone number to +1-XXX-XXX-XXXX
    const formattedPhone = formData.phone.replace(/\D/g, '');
    if (formattedPhone.length !== 10) {
      setError('Phone number must be 10 digits');
      return;
    }
    const phone = `+1-${formattedPhone.slice(0, 3)}-${formattedPhone.slice(3, 6)}-${formattedPhone.slice(6)}`;

    setLoading(true);

    try {
      const { password, confirmPassword, ...userData } = formData;
      await signup({ ...userData, password, phone });
      setSuccess(true);
    } catch (err) {
      setError(err.error?.message || err.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // Redirect to backend OAuth endpoint with selected user type
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    // Include apply_job in Google OAuth flow
    const applyJobParam = applyJobId ? `&apply_job=${applyJobId}` : '';
    window.location.href = `${backendUrl}/api/auth/google/login?user_type=${selectedUserType}${applyJobParam}`;
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: theme.bgColor }}>
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email!</h2>
            <p className="text-gray-600 mb-4">
              We sent a verification link to <strong>{formData.email}</strong>. 
              Please check your inbox and click the link to activate your account.
            </p>
            {applyJobId && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800">
                  📋 Your job application will be submitted automatically after you verify your email and complete your profile.
                </p>
              </div>
            )}
            <Link
              to="/login"
              className="inline-block py-3 px-6 rounded-lg text-white font-medium"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-8" style={{ backgroundColor: theme.bgColor }}>
      {/* Back Button */}
      <div className="max-w-md mx-auto w-full mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src={theme.logo}
              alt="HR Bank Logo"
              className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg"
            />
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">Join HR Bank today</p>
          </div>

        {/* User Type Selection - Tab Style */}
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

        {/* Signup Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Google Sign-Up Button */}
          <button
            onClick={googleAvailable ? handleGoogleSignup : undefined}
            type="button"
            disabled={!googleAvailable}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border-2 rounded-lg transition-colors mb-6 ${
              googleAvailable 
                ? 'border-gray-300 hover:bg-gray-50 cursor-pointer' 
                : 'border-gray-200 bg-gray-100 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className={`font-medium ${googleAvailable ? 'text-gray-700' : 'text-gray-400'}`}>
              {googleAvailable ? 'Sign up with Google' : 'Google Sign-up Unavailable'}
            </span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                placeholder="(519) 555-0123"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                Min 8 characters, 1 uppercase, 1 number, 1 special character
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="mt-1 mr-2"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to the{' '}
                <a href="/terms" className="hover:underline" style={{ color: theme.primaryColor }}>
                  Terms & Conditions
                </a>
                {' '}and{' '}
                <a href="/privacy" className="hover:underline" style={{ color: theme.primaryColor }}>
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: theme.primaryColor }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

const Signup = () => {
  const [selectedUserType, setSelectedUserType] = useState('workforce');
  const [searchParams] = useSearchParams();
  const [applyJobId, setApplyJobId] = useState(null);

  // Set initial user type from URL parameter and capture job application context
  React.useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && ['workforce', 'employer', 'institution'].includes(typeParam)) {
      setSelectedUserType(typeParam);
    }
    
    // Capture job application context
    const jobId = searchParams.get('apply_job');
    if (jobId) {
      setApplyJobId(jobId);
    }
  }, [searchParams]);

  return (
    <ThemeProvider key={selectedUserType} userType={selectedUserType}>
      <SignupForm 
        selectedUserType={selectedUserType} 
        setSelectedUserType={setSelectedUserType}
        applyJobId={applyJobId}
      />
    </ThemeProvider>
  );
};

export default Signup;
