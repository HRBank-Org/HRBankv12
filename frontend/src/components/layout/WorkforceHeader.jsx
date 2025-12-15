import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FiBell, FiMessageSquare, FiSettings, FiLogOut } from 'react-icons/fi';
import api from '../../utils/api';

const WorkforceHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [occupations, setOccupations] = useState([]);

  useEffect(() => {
    loadCounts();
    loadOccupations();
  }, []);

  const loadCounts = async () => {
    try {
      const [notifRes, msgRes] = await Promise.all([
        api.get('/api/notifications/my-notifications?unread_only=true').catch(() => ({ data: { data: { unread_count: 0 } } })),
        api.get('/api/messages/threads').catch(() => ({ data: { data: { total_unread: 0 } } }))
      ]);
      
      setNotificationCount(notifRes.data.data?.unread_count || 0);
      setMessageCount(msgRes.data.data?.total_unread || 0);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

  const loadOccupations = async () => {
    try {
      const res = await api.get('/api/occupations/me');
      const occs = res.data.data?.occupations || [];
      setOccupations(occs);
    } catch (error) {
      console.error('Failed to load occupations:', error);
    }
  };

  return (
    <header 
      className="fixed top-0 right-0 z-40 shadow-lg transition-all duration-300"
      style={{ 
        backgroundColor: theme.primaryColor || '#3b82f6',
        left: 'var(--sidebar-width, 70px)'
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: User Info */}
        <div className="flex items-center gap-4">
          {/* User Photo */}
          {user?.profile?.photo_url ? (
            <img 
              src={user.profile.photo_url.startsWith('http') 
                ? user.profile.photo_url 
                : `${process.env.REACT_APP_BACKEND_URL}${user.profile.photo_url}`
              }
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover bg-white border-2 border-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white font-bold text-xl border-2 border-white">
              {(user?.profile?.first_name?.[0] || user?.email?.[0] || 'W').toUpperCase()}
            </div>
          )}
          
          {/* User Name & Occupations */}
          <div className="text-white">
            <div className="font-bold text-lg leading-tight">
              {user?.profile?.first_name && user?.profile?.last_name 
                ? `${user.profile.first_name} ${user.profile.last_name}`
                : user?.profile?.full_name || 'Worker'
              }
            </div>
            <div className="text-sm opacity-90">
              {occupations.length > 0 
                ? occupations.map(occ => occ.occupation_title).join(' • ')
                : 'No occupation profiles'
              }
            </div>
          </div>
        </div>

        {/* Right: Action Icons */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            onClick={() => navigate('/workforce/notifications')}
            className="relative p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors group"
            title="Notifications"
          >
            <FiBell size={20} className="text-white" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notificationCount}
              </span>
            )}
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Notifications
            </div>
          </button>

          {/* Messages */}
          <button
            onClick={() => navigate('/workforce/messages')}
            className="relative p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors group"
            title="Messages"
          >
            <FiMessageSquare size={20} className="text-white" />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {messageCount}
              </span>
            )}
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Messages
            </div>
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/workforce/settings')}
            className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors group"
            title="Settings"
          >
            <FiSettings size={20} className="text-white" />
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Settings
            </div>
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-white bg-opacity-30 mx-2"></div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 hover:bg-red-600 hover:bg-opacity-30 rounded-lg transition-colors group"
            title="Logout"
          >
            <FiLogOut size={20} className="text-white" />
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Logout
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default WorkforceHeader;
