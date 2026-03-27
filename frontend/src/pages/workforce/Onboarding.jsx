import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

import { useLanguage } from '../../contexts/LanguageContext';

const WorkforceOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();

  // Redirect based on user status
  useEffect(() => {
    if (!user) return;
    
    // If user is active, go to dashboard
    if (user.profile_status === 'active' || user.account_status === 'active') {
      navigate('/workforce/dashboard');
      return;
    }
    
    // If user is pending, go to pending approval page
    if (user.profile_status === 'pending' || 
        user.profile_status === 'pending verification' || 
        user.profile_status === 'pending_verification') {
      navigate('/pending-approval');
      return;
    }
  }, [user, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto mb-4" style={{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }}></div>
        <p className="text-gray-600">Checking account status...</p>
      </div>
    </div>
  );
};

export default WorkforceOnboarding;
