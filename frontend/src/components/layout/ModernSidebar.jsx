import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiCalendar, FiMapPin, FiUsers, FiUserCheck, FiClock, FiDollarSign, FiFileText, FiChevronRight } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';

const ModernSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  const showExpanded = isExpanded || hovering;

  // Update CSS variable when sidebar state changes
  React.useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', showExpanded ? '240px' : '70px');
  }, [showExpanded]);

  const menuItems = [
    {
      type: 'item',
      label: 'Home',
      icon: FiHome,
      path: '/employer/home'
    },
    {
      type: 'category',
      label: 'Operations'
    },
    {
      type: 'item',
      label: 'Roster',
      icon: FiCalendar,
      path: '/employer/roster'
    },
    {
      type: 'item',
      label: 'Workplaces',
      icon: FiMapPin,
      path: '/employer/workplaces'
    },
    {
      type: 'category',
      label: 'HR Management'
    },
    {
      type: 'item',
      label: 'Roles',
      icon: FiUsers,
      path: '/employer/roles'
    },
    {
      type: 'item',
      label: 'Team',
      icon: FiUserCheck,
      path: '/employer/workforce-management'
    },
    {
      type: 'item',
      label: 'Live Attendance',
      icon: FiClock,
      path: '/employer/live-attendance'
    },
    {
      type: 'category',
      label: 'Finances'
    },
    {
      type: 'item',
      label: 'Timesheets',
      icon: FiFileText,
      path: '/employer/timesheets'
    },
    {
      type: 'item',
      label: 'Payroll',
      icon: FiDollarSign,
      path: '/employer/payroll'
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
    
    // Check if current path matches
    if (location.pathname === item.path) {
      // If there's a state requirement, check it too
      if (item.state) {
        return Object.keys(item.state).every(key => 
          location.state && location.state[key] === item.state[key]
        );
      }
      return true;
    }
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
            backgroundColor: '#1a1d29'
          }}
        >
          {/* Shadow overlay effect (appears as if content casts shadow on sidebar) */}
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
              alt="HR Bank"
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
              <span className="text-white font-bold text-lg whitespace-nowrap">
                HR Bank
              </span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
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
                    w-full flex items-center px-3 py-3 rounded-xl
                    transition-colors duration-200 group relative
                    ${active 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  {/* Fixed-size icon container to prevent resize during transition */}
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <Icon 
                      size={20} 
                      className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
                      style={{ width: '20px', height: '20px' }}
                    />
                  </div>
                  
                  {/* Text container with overflow hidden for smooth transition */}
                  <div 
                    className={`flex items-center flex-1 overflow-hidden transition-all duration-300 ${showExpanded ? 'ml-3 opacity-100 max-w-[180px]' : 'ml-0 opacity-0 max-w-0'}`}
                  >
                    <span className="text-left text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                    {active && showExpanded && (
                      <FiChevronRight size={16} className="text-white ml-auto flex-shrink-0" />
                    )}
                  </div>

                  {/* Tooltip for collapsed state */}
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

        {/* Footer - Toggle Button (Optional) */}
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

export default ModernSidebar;
