import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FiHome, FiCalendar, FiMapPin, FiUsers, FiUserCheck, FiClock, FiFileText, FiDollarSign, FiBell, FiMessageSquare, FiSettings, FiLogOut, FiFolder, FiChevronDown } from 'react-icons/fi';

const OrangeHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(false);
  const [financesOpen, setFinancesOpen] = useState(false);
  const [notificationCount] = useState(3);
  const [messageCount] = useState(5);

  const navigationItems = [
    {
      type: 'item',
      label: 'Home',
      icon: FiHome,
      path: '/employer/home'
    },
    {
      type: 'dropdown',
      label: 'Operations',
      icon: FiCalendar,
      isOpen: operationsOpen,
      setOpen: setOperationsOpen,
      items: [
        { label: 'Roster', icon: FiCalendar, path: '/employer/roster' },
        { label: 'Workplaces', icon: FiMapPin, path: '/employer/workplaces' }
      ]
    },
    {
      type: 'dropdown',
      label: 'HR Management',
      icon: FiUsers,
      isOpen: hrOpen,
      setOpen: setHrOpen,
      items: [
        { label: 'Roles', icon: FiUsers, path: '/employer/roles' },
        { label: 'Team', icon: FiUserCheck, path: '/employer/workforce-management' },
        { label: 'Live Attendance', icon: FiClock, path: '/employer/live-attendance' }
      ]
    },
    {
      type: 'dropdown',
      label: 'Finances',
      icon: FiDollarSign,
      isOpen: financesOpen,
      setOpen: setFinancesOpen,
      items: [
        { label: 'Timesheets', icon: FiFileText, path: '/employer/timesheets' },
        { label: 'Payroll', icon: FiDollarSign, path: '/employer/payroll' }
      ]
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
    
    if (location.pathname === item.path) {
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
    <header 
      className="fixed top-0 left-0 right-0 z-50 shadow-lg"
      style={{ backgroundColor: theme.primaryColor || '#ff6b35' }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Logo + Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src={theme.logo}
              alt="HR Bank"
              className="w-10 h-10 rounded-lg"
              style={{ objectFit: 'cover' }}
            />
            <span className="text-white font-bold text-xl hidden lg:block">HR Bank</span>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navigationItems.map((item, index) => {
              if (item.type === 'item') {
                const Icon = item.icon;
                const active = isActive(item);
                
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigation(item)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active 
                        ? 'bg-white bg-opacity-20 text-white' 
                        : 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              } else if (item.type === 'dropdown') {
                const Icon = item.icon;
                const anyActive = item.items.some(subItem => isActive(subItem));
                
                return (
                  <div key={index} className="relative">
                    <button
                      onClick={() => item.setOpen(!item.isOpen)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        anyActive 
                          ? 'bg-white bg-opacity-20 text-white' 
                          : 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                      <FiChevronDown 
                        size={14} 
                        className={`transition-transform ${item.isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {item.isOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl py-2 min-w-[200px] z-50">
                        {item.items.map((subItem, subIndex) => {
                          const SubIcon = subItem.icon;
                          const subActive = isActive(subItem);
                          
                          return (
                            <button
                              key={subIndex}
                              onClick={() => {
                                handleNavigation(subItem);
                                item.setOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                subActive
                                  ? 'bg-orange-50 text-orange-600 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <SubIcon size={16} />
                              <span>{subItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </nav>
        </div>

        {/* Right: Actions + User */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            onClick={() => navigate('/employer/notifications')}
            className="relative p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            title="Notifications"
          >
            <FiBell size={20} className="text-white" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Messages */}
          <button
            onClick={() => navigate('/employer/messages')}
            className="relative p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            title="Messages"
          >
            <FiMessageSquare size={20} className="text-white" />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {messageCount}
              </span>
            )}
          </button>

          {/* Documents */}
          <button
            onClick={() => navigate('/employer/documents')}
            className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            title="Documents"
          >
            <FiFolder size={20} className="text-white" />
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/employer/settings')}
            className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            title="Settings"
          >
            <FiSettings size={20} className="text-white" />
          </button>

          {/* Divider */}
          <div className="h-8 w-px bg-white bg-opacity-30 mx-2"></div>

          {/* User Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-white bg-opacity-10 rounded-lg">
            {user?.profile?.photo_url ? (
              <img 
                src={user.profile.photo_url} 
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white font-bold text-sm">
                {(user?.profile?.first_name?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <span className="text-white text-sm font-medium hidden lg:block">
              {user?.profile?.first_name} {user?.profile?.last_name}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition-colors"
            title="Logout"
          >
            <FiLogOut size={20} className="text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default OrangeHeader;
