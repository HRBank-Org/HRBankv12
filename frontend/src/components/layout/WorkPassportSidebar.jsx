import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiBriefcase, 
  FiAward, 
  FiGlobe, 
  FiShare2, 
  FiSettings, 
  FiHelpCircle,
  FiChevronRight,
  FiTrendingUp,
  FiBook,
  FiUsers,
  FiHeart
} from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const WorkPassportSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user } = useAuth();
  
  const showExpanded = isExpanded || hovering;

  // Check if user is Canadian (eligible for Workforce upgrade)
  const isCanadian = user?.profile?.country === 'CA';

  // Update CSS variable when sidebar state changes
  React.useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', showExpanded ? '240px' : '70px');
  }, [showExpanded]);

  const menuItems = [
    {
      type: 'item',
      label: 'Dashboard',
      icon: FiHome,
      path: '/workpassport/dashboard'
    },
    {
      type: 'category',
      label: 'Credentials'
    },
    {
      type: 'item',
      label: 'My Credentials',
      icon: FiAward,
      path: '/workpassport/credentials'
    },
    {
      type: 'item',
      label: 'Occupations',
      icon: FiBriefcase,
      path: '/workpassport/occupations'
    },
    {
      type: 'category',
      label: 'Career'
    },
    {
      type: 'item',
      label: 'Job Opportunities',
      icon: FiBriefcase,
      path: '/workpassport/jobs',
      badge: isCanadian ? null : 'Preview'
    },
    {
      type: 'category',
      label: 'Community'
    },
    {
      type: 'item',
      label: 'Fundraisers',
      icon: FiHeart,
      path: '/workpassport/fundraisers'
    },
    {
      type: 'category',
      label: 'Profile'
    },
    {
      type: 'item',
      label: 'Public Profile',
      icon: FiGlobe,
      path: '/workpassport/public-profile'
    },
    {
      type: 'item',
      label: 'Share Profile',
      icon: FiShare2,
      path: '/workpassport/share'
    },
    {
      type: 'item',
      label: 'Settings',
      icon: FiSettings,
      path: '/workpassport/settings'
    },
    {
      type: 'category',
      label: 'Support'
    },
    {
      type: 'item',
      label: 'Help & Support',
      icon: FiHelpCircle,
      path: '/workpassport/support'
    }
  ];

  const handleNavigation = (item) => {
    if (item.state) {
      navigate(item.path, { state: item.state });
    } else {
      navigate(item.path);
    }
  };

  const isActive = (item) => {
    if (!item.path) return false;
    if (location.pathname === item.path) return true;
    // Also check if path starts with the menu item path (for nested routes)
    if (location.pathname.startsWith(item.path + '/')) return true;
    return false;
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className="fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out"
        style={{
          width: showExpanded ? '240px' : '70px'
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div
          className="h-full flex flex-col relative"
          style={{
            backgroundColor: '#0f172a' // Darker blue for WorkPassport
          }}
        >
          {/* Shadow overlay effect */}
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
                alt="WorkPassport"
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
                <div className="flex flex-col">
                  <span className="text-white font-bold text-lg whitespace-nowrap">
                    WorkPassport
                  </span>
                  <span className="text-cyan-400 text-xs">
                    by HR Bank
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Upgrade Banner for Canadian Users */}
          {isCanadian && showExpanded && (
            <div className="mx-3 mt-4 p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl border border-purple-500/30">
              <p className="text-xs text-purple-300 mb-2">Ready to work in Canada?</p>
              <button
                onClick={() => navigate('/workpassport/upgrade')}
                className="w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all"
              >
                Upgrade to Workforce
              </button>
            </div>
          )}

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
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg' 
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

          {/* Footer - Toggle Button */}
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
    </>
  );
};

export default WorkPassportSidebar;
