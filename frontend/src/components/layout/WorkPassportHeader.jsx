import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FiSettings, FiLogOut } from 'react-icons/fi';
import LanguageSelector from '../common/LanguageSelector';
import NotificationDropdown from '../common/NotificationDropdown';

const WorkPassportHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getUserInitial = () => {
    if (user?.profile?.full_name) {
      return user.profile.full_name.charAt(0).toUpperCase();
    }
    return 'W';
  };

  return (
    <header 
      className="fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-6"
      style={{ left: 'var(--sidebar-width, 70px)' }}
    >
      {/* Left - Page context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">WorkPassport</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">Dashboard</span>
        </div>
      </div>

      {/* Right - User actions */}
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <LanguageSelector variant="compact" />
        
        {/* Notifications Dropdown */}
        <NotificationDropdown variant="light" />

        {/* Settings */}
        <button 
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => navigate('/workpassport/settings')}
        >
          <FiSettings size={20} />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200"></div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500">
              {user?.profile?.passport_id || 'WorkPassport'}
            </p>
          </div>
          
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: '#0ea5e9' }}
          >
            {getUserInitial()}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign Out"
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default WorkPassportHeader;
