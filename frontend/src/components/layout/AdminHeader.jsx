import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from '../common/LanguageSelector';
import { Bell, Search, HelpCircle } from 'lucide-react';
import api from '../../utils/api';

const AdminHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();
  const [notificationCount, setNotificationCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminProfile, setAdminProfile] = useState(null);

  useEffect(() => {
    fetchNotificationCount();
    fetchAdminProfile();
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const res = await api.get('/api/notifications/my-notifications?limit=1');
      if (res.data.success) {
        setNotificationCount(res.data.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const fetchAdminProfile = async () => {
    try {
      const res = await api.get('/api/admin/my-profile');
      if (res.data.success) {
        setAdminProfile(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch admin profile:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/users?search=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const displayName = adminProfile?.full_name || user?.full_name || user?.email?.split('@')[0] || 'Admin';
  const profileImage = adminProfile?.profile_image || user?.profile_image;
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header 
      className="fixed top-0 right-0 z-30 shadow-sm transition-all duration-300 bg-white border-b"
      style={{ 
        left: 'var(--sidebar-width, 70px)'
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Welcome Message with Photo */}
        <div className="flex items-center gap-4">
          {/* Admin Photo */}
          {profileImage ? (
            <img 
              src={profileImage}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border-2 border-orange-200"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm border-2 border-orange-200"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {initials}
            </div>
          )}
          
          <div>
            <p className="text-sm text-gray-500">Welcome back,</p>
            <h1 className="text-lg font-semibold text-gray-900">{displayName}</h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <LanguageSelector variant="compact" />
          
          {/* Search Toggle */}
          {showSearch ? (
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                onBlur={() => !searchQuery && setShowSearch(false)}
                className="w-64 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </form>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Search"
            >
              <Search size={20} />
            </button>
          )}

          {/* Notifications */}
          <button
            onClick={() => navigate('/admin/notification-settings')}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Help */}
          <button
            onClick={() => navigate('/admin/support-tickets')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Help & Support"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
