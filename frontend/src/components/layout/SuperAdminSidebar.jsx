import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, FiUsers, FiUserCheck, FiShield, FiGrid, 
  FiMessageSquare, FiSettings, FiChevronRight, FiActivity,
  FiCheckCircle, FiAward, FiDatabase
} from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';

const SuperAdminSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  const showExpanded = isExpanded || hovering;

  React.useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', showExpanded ? '240px' : '70px');
  }, [showExpanded]);

  const menuItems = [
    {
      type: 'item',
      label: 'Dashboard',
      icon: FiHome,
      path: '/admin/dashboard'
    },
    {
      type: 'category',
      label: 'User Management'
    },
    {
      type: 'item',
      label: 'Pending Activations',
      icon: FiUserCheck,
      path: '/admin/pending-activations'
    },
    {
      type: 'item',
      label: 'Credential Reviews',
      icon: FiAward,
      path: '/admin/credentials'
    },
    {
      type: 'category',
      label: 'Administration'
    },
    {
      type: 'item',
      label: 'Admin Users',
      icon: FiShield,
      path: '/admin/admins'
    },
    {
      type: 'item',
      label: 'Franchises',
      icon: FiGrid,
      path: '/admin/franchises'
    },
    {
      type: 'category',
      label: 'Support'
    },
    {
      type: 'item',
      label: 'Support Tickets',
      icon: FiMessageSquare,
      path: '/admin/support-tickets'
    },
    {
      type: 'category',
      label: 'Platform'
    },
    {
      type: 'item',
      label: 'Analytics',
      icon: FiActivity,
      path: '/admin/analytics'
    },
    {
      type: 'item',
      label: 'Occupations',
      icon: FiDatabase,
      path: '/admin/occupations'
    },
    {
      type: 'item',
      label: 'Settings',
      icon: FiSettings,
      path: '/admin/settings'
    }
  ];

  const handleNavigation = (item) => {
    navigate(item.path);
  };

  const isActive = (item) => {
    if (!item.path) return false;
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  return (
    <div
      className="fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out"
      style={{ width: showExpanded ? '240px' : '70px' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="h-full flex flex-col relative"
        style={{ backgroundColor: '#1a1d29' }}
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset -8px 0 16px -8px rgba(0, 0, 0, 0.3)',
            zIndex: 1
          }}
        />
        
        {/* Logo */}
        <div className="flex items-center justify-center h-20 border-b border-gray-700/50">
          <div className="flex items-center gap-3 px-4">
            <img 
              src={theme.logo}
              alt="HR Bank Admin"
              className="rounded-xl flex-shrink-0"
              style={{
                width: '48px',
                height: '48px',
                minWidth: '48px',
                minHeight: '48px',
                objectFit: 'contain'
              }}
            />
            {showExpanded && (
              <div>
                <span className="text-white font-bold text-lg whitespace-nowrap block">HR Bank</span>
                <span className="text-orange-400 text-xs whitespace-nowrap">Super Admin</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className={`flex-1 overflow-y-auto py-6 ${showExpanded ? 'px-3' : 'px-2'}`}>
          <div className="space-y-1">
            {menuItems.map((item, index) => {
              if (item.type === 'category') {
                return (
                  <div
                    key={index}
                    className="px-3 pt-6 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {showExpanded ? item.label : '—'}
                  </div>
                );
              }

              const Icon = item.icon;
              const active = isActive(item);

              return (
                <button
                  key={index}
                  onClick={() => handleNavigation(item)}
                  className={`
                    w-full flex items-center py-3 rounded-xl
                    transition-colors duration-200 group relative
                    ${showExpanded ? 'px-3 justify-start' : 'justify-center'}
                    ${active 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Icon 
                    size={20} 
                    className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
                  />
                  
                  {showExpanded && (
                    <span className="ml-3 text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                  
                  {active && showExpanded && (
                    <FiChevronRight size={16} className="text-white ml-auto flex-shrink-0" />
                  )}

                  {!showExpanded && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-xl z-50 transition-opacity duration-200">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-700/50 p-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
          >
            <FiChevronRight 
              size={20} 
              className={`transition-transform duration-300 ${showExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSidebar;
