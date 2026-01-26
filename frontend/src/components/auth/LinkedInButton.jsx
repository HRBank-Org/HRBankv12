import React, { useState } from 'react';
import { FiLinkedin } from 'react-icons/fi';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const LinkedInButton = ({ 
  mode = 'signup', // 'signup' | 'login' | 'connect'
  redirectAfter = '/workpassport/dashboard',
  className = '',
  fullWidth = true 
}) => {
  const [loading, setLoading] = useState(false);

  const handleLinkedInAuth = () => {
    setLoading(true);
    
    // Redirect to backend LinkedIn OAuth endpoint
    const authUrl = `${API_URL}/api/linkedin/authorize?redirect_after=${encodeURIComponent(redirectAfter)}`;
    window.location.href = authUrl;
  };

  const getButtonText = () => {
    if (loading) return 'Connecting...';
    switch (mode) {
      case 'signup':
        return 'Sign up with LinkedIn';
      case 'login':
        return 'Sign in with LinkedIn';
      case 'connect':
        return 'Connect LinkedIn';
      default:
        return 'Continue with LinkedIn';
    }
  };

  return (
    <button
      onClick={handleLinkedInAuth}
      disabled={loading}
      className={`
        flex items-center justify-center gap-3 
        px-6 py-3 
        bg-[#0A66C2] hover:bg-[#004182] 
        text-white font-semibold 
        rounded-xl 
        transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <FiLinkedin size={20} />
      )}
      <span>{getButtonText()}</span>
    </button>
  );
};

export default LinkedInButton;
