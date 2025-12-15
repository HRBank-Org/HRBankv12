import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FiBell, FiMessageSquare, FiSettings, FiLogOut, FiFolder } from 'react-icons/fi';

const GenericHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [notificationCount] = useState(3);
  const [messageCount] = useState(5);

  return (
    <header 
      className="fixed top-0 right-0 z-40 shadow-lg transition-all duration-300"
      style={{ 
        backgroundColor: theme.primaryColor || '#ff6b35',
        left: '70px' // Start after collapsed sidebar
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Company Logo + Info + User */}
        <div className="flex items-center gap-4">
          {/* Company Logo */}
          {user?.profile?.photo_url ? (
            <img 
              src={user.profile.photo_url.startsWith('http') 
                ? user.profile.photo_url 
                : `${process.env.REACT_APP_BACKEND_URL}${user.profile.photo_url}`
              }
              alt="Company Logo"
              className="w-12 h-12 rounded-lg object-cover bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white bg-opacity-20 flex items-center justify-center text-white font-bold text-xl">
              {(user?.profile?.business_name?.[0] || user?.profile?.first_name?.[0] || 'C').toUpperCase()}
            </div>
          )}
          
          {/* Company Name + User Name */}
          <div className="text-white">
            <div className="font-bold text-lg leading-tight">
              {user?.profile?.business_name || user?.profile?.company_name || 'Company Name'}
            </div>
            <div className="text-sm opacity-90">
              {user?.profile?.first_name} {user?.profile?.last_name}
              {user?.profile?.title && ` • ${user.profile.title}`}
            </div>
          </div>
        </div>

        {/* Right: Action Icons */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            onClick={() => navigate(`/${user?.user_type}/notifications`)}
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
            onClick={() => navigate(`/${user?.user_type}/messages`)}
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

          {/* Documents */}
          <button
            onClick={() => navigate(`/${user?.user_type}/documents`)}
            className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors group"
            title="Documents"
          >
            <FiFolder size={20} className="text-white" />
            <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Documents
            </div>
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate(`/${user?.user_type}/settings`)}
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

export default GenericHeader;
