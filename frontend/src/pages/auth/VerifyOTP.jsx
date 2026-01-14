import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';
import { FiMail, FiPhone, FiCheckCircle, FiRefreshCw, FiClock, FiShield } from 'react-icons/fi';

const OTPInput = ({ length = 6, value, onChange, disabled }) => {
  const inputRefs = useRef([]);

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return; // Only allow digits

    const newValue = value.split('');
    newValue[index] = val.slice(-1); // Take only the last digit
    const newOtp = newValue.join('');
    onChange(newOtp);

    // Move to next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pastedData);
    if (pastedData.length === length) {
      inputRefs.current[length - 1]?.focus();
    } else {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all ${
            disabled 
              ? 'bg-gray-100 border-gray-200 text-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
          }`}
          data-testid={`otp-input-${index}`}
        />
      ))}
    </div>
  );
};

const VerifyOTPForm = ({ userId, userType }) => {
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const navigate = useNavigate();
  const theme = useTheme();

  // Fetch verification status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
        const response = await fetch(`${backendUrl}/api/auth/signup-verification-status/${userId}`);
        const data = await response.json();
        
        if (data.success) {
          setVerificationData(data.data);
          
          // Calculate time left
          if (data.data.otp_expires_at) {
            const expiresAt = new Date(data.data.otp_expires_at);
            const now = new Date();
            const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
            setTimeLeft(diff);
          }
        }
      } catch (err) {
        console.error('Failed to fetch verification status:', err);
      }
    };

    if (userId) {
      fetchStatus();
    }
  }, [userId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (emailOtp.length !== 6) {
      setError('Please enter the complete 6-digit email code');
      return;
    }

    if (phoneOtp.length !== 6) {
      setError('Please enter the complete 6-digit phone code');
      return;
    }

    setLoading(true);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/auth/verify-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          email_otp: emailOtp,
          phone_otp: phoneOtp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Verification failed');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (type) => {
    setResending(true);
    setError('');

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/auth/resend-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          otp_type: type
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to resend code');
      }

      setTimeLeft(600); // Reset timer
      
      if (type === 'email' || type === 'both') {
        setEmailOtp('');
      }
      if (type === 'phone' || type === 'both') {
        setPhoneOtp('');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend codes');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: theme.bgColor }}>
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Verification Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your email and phone have been verified successfully. Your account is now pending admin approval.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <FiClock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-left">
                  <p className="font-medium text-amber-800">What happens next?</p>
                  <p className="text-sm text-amber-700 mt-1">
                    An administrator will review and approve your account. You'll receive a notification once approved.
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-block w-full py-3 px-6 rounded-lg text-white font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primaryColor }}
              data-testid="go-to-login-btn"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: theme.bgColor }}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiShield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Account</h1>
          <p className="text-gray-600 mt-2">
            Enter the 6-digit codes sent to your email and phone
          </p>
        </div>

        {/* Timer */}
        <div className={`text-center mb-6 py-2 px-4 rounded-full inline-flex items-center gap-2 mx-auto ${
          timeLeft > 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`} style={{ display: 'flex', justifyContent: 'center' }}>
          <FiClock className="w-4 h-4" />
          <span className="font-medium">
            {timeLeft > 0 ? `Codes expire in ${formatTime(timeLeft)}` : 'Codes expired'}
          </span>
        </div>

        {/* Verification Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleVerify}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            {/* Email OTP Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FiMail className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Email Verification</span>
              </div>
              {verificationData?.email && (
                <p className="text-sm text-gray-500 mb-3 text-center">
                  Code sent to: <span className="font-medium">{verificationData.email}</span>
                </p>
              )}
              <OTPInput
                value={emailOtp}
                onChange={setEmailOtp}
                disabled={loading || timeLeft <= 0}
              />
              <button
                type="button"
                onClick={() => handleResend('email')}
                disabled={resending || timeLeft > 540} // Can resend after 1 minute
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1 mx-auto"
              >
                <FiRefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                Resend email code
              </button>
            </div>

            {/* Phone OTP Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FiPhone className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Phone Verification</span>
              </div>
              {verificationData?.phone && (
                <p className="text-sm text-gray-500 mb-3 text-center">
                  Code sent to: <span className="font-medium">{verificationData.phone}</span>
                </p>
              )}
              <OTPInput
                value={phoneOtp}
                onChange={setPhoneOtp}
                disabled={loading || timeLeft <= 0}
              />
              <button
                type="button"
                onClick={() => handleResend('phone')}
                disabled={resending || timeLeft > 540}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1 mx-auto"
              >
                <FiRefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                Resend phone code
              </button>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || emailOtp.length !== 6 || phoneOtp.length !== 6 || timeLeft <= 0}
              className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.primaryColor }}
              data-testid="verify-otp-btn"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Account'
              )}
            </button>

            {/* Resend Both */}
            {timeLeft <= 0 && (
              <button
                type="button"
                onClick={() => handleResend('both')}
                disabled={resending}
                className="w-full mt-4 py-3 px-4 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <FiRefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending...' : 'Resend Both Codes'}
              </button>
            )}
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Didn't receive the codes? Check your spam folder or{' '}
              <button
                onClick={() => handleResend('both')}
                disabled={resending}
                className="text-blue-600 hover:underline"
              >
                resend both codes
              </button>
            </p>
          </div>
        </div>

        {/* Back to Signup */}
        <div className="text-center mt-6">
          <Link to="/signup" className="text-gray-600 hover:text-gray-900">
            ← Back to Signup
          </Link>
        </div>
      </div>
    </div>
  );
};

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  const userType = searchParams.get('user_type') || 'workforce';

  if (!userId) {
    return (
      <ThemeProvider userType="workforce">
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiShield className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
              <p className="text-gray-600 mb-6">
                This verification link is invalid or has expired. Please sign up again.
              </p>
              <Link
                to="/signup"
                className="inline-block py-3 px-6 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700"
              >
                Go to Signup
              </Link>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider userType={userType}>
      <VerifyOTPForm userId={userId} userType={userType} />
    </ThemeProvider>
  );
};

export default VerifyOTP;
