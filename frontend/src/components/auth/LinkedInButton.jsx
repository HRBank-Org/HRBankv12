import React, { useState } from 'react';

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
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )}
      <span>{getButtonText()}</span>
    </button>
  );
};

export default LinkedInButton;
