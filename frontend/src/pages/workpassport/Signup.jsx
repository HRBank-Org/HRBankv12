import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiGlobe, FiAward, FiShare2, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../../utils/api';
import LinkedInButton from '../../components/auth/LinkedInButton';
import LanguageSelector from '../../components/common/LanguageSelector';

const COUNTRIES = [
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'OTHER', name: 'Other', flag: '🌍' }
];

const WorkPassportSignup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    country: '',
    city: ''
  });

  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.full_name.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.country) {
      setError('Please select your country');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
      return;
    }

    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/workpassport/register', {
        email: formData.email.toLowerCase(),
        password: formData.password,
        full_name: formData.full_name,
        country: formData.country,
        city: formData.city || null
      });

      if (response.data.success) {
        setResult(response.data.data);
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: FiAward, title: 'Verified Credentials', desc: 'Store and verify your certificates, licenses, and qualifications' },
    { icon: FiGlobe, title: 'Global Recognition', desc: 'Share your credentials with employers worldwide' },
    { icon: FiShare2, title: 'Instant Sharing', desc: 'Generate a shareable link or QR code for your profile' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back</span>
        </button>
        <LanguageSelector variant="compact" className="text-white" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Form */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            {/* Progress Indicator */}
            <div className="flex items-center gap-3 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= s 
                      ? 'bg-cyan-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s ? <FiCheck /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-12 h-1 rounded ${
                      step > s ? 'bg-cyan-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {step === 1 && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your WorkPassport</h2>
                <p className="text-gray-600 mb-6">Join millions building their verified work identity</p>

                {/* LinkedIn Sign Up - Primary Option */}
                <div className="mb-6">
                  <LinkedInButton 
                    mode="signup" 
                    redirectAfter="/workpassport/dashboard"
                  />
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Instantly import your profile from LinkedIn
                  </p>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or sign up with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                      placeholder="John Smith"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none pr-12"
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all"
                  >
                    Continue
                  </button>
                </form>

                <p className="text-center text-gray-600 mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-cyan-600 hover:underline font-medium">
                    Sign In
                  </Link>
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Where are you located?</h2>
                <p className="text-gray-600 mb-6">This helps us provide region-specific features</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none appearance-none bg-white"
                    >
                      <option value="">Select your country</option>
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City (Optional)</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                      placeholder="e.g., Toronto, London, Dubai"
                    />
                  </div>

                  {formData.country === 'CA' && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <p className="text-sm text-purple-800 font-medium mb-1">🇨🇦 Canadian Resident?</p>
                      <p className="text-sm text-purple-700">
                        After creating your WorkPassport, you can upgrade to a full Workforce account to access job matching and get hired by Canadian employers!
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Creating Account...' : 'Create WorkPassport'}
                  </button>
                </form>
              </>
            )}

            {step === 3 && result && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiCheck size={40} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to WorkPassport!</h2>
                <p className="text-gray-600 mb-6">Your global work identity has been created</p>

                <div className="bg-gray-100 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-500 mb-1">Your Passport ID</p>
                  <p className="text-xl font-mono font-bold text-gray-900">{result.passport_id}</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all"
                  >
                    Sign In to Your Account
                  </button>
                  <p className="text-sm text-gray-500">
                    Check your email to verify your account
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right - Features */}
          <div className="text-white space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4 flex items-center gap-4">
                <img 
                  src="/work-passport-seal.png" 
                  alt="WorkPassport" 
                  className="object-contain flex-shrink-0"
                  style={{ height: '2.4em', width: 'auto' }}
                />
                <span>
                  Your Global
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    Work Identity
                  </span>
                </span>
              </h1>
              <p className="text-xl text-white/70">
                WorkPassport helps you build a verified credential portfolio that employers trust worldwide.
              </p>
            </div>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <feature.icon size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-white/60">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
              <p className="text-white/80 text-sm">
                "WorkPassport made it easy to share my certifications with potential employers. 
                Got hired within 2 weeks of creating my profile!"
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center font-bold">
                  M
                </div>
                <div>
                  <p className="font-medium">Maria S.</p>
                  <p className="text-sm text-white/60">Healthcare Professional, UAE</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkPassportSignup;
