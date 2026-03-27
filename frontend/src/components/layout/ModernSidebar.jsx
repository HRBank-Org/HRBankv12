import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiCalendar, FiMapPin, FiUsers, FiUserCheck, FiClock, FiDollarSign, FiFileText, FiChevronRight, FiNavigation, FiSun, FiHelpCircle, FiCreditCard, FiPackage, FiTruck, FiGlobe, FiUploadCloud, FiRefreshCw, FiMonitor } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage, LANGUAGES } from '../../contexts/LanguageContext';

const ModernSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const showExpanded = isExpanded || hovering;

  // Update CSS variable when sidebar state changes
  React.useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', showExpanded ? '240px' : '70px');
  }, [showExpanded]);

  const menuItems = [
    {
      type: 'item',
      label: t('nav.employer.home'),
      icon: FiHome,
      path: '/employer/home'
    },
    {
      type: 'category',
      label: t('nav.employer.operations')
    },
    {
      type: 'item',
      label: t('nav.employer.roster'),
      icon: FiCalendar,
      path: '/employer/roster'
    },
    {
      type: 'item',
      label: t('nav.employer.workOrders'),
      icon: FiPackage,
      path: '/employer/work-orders'
    },
    {
      type: 'item',
      label: t('nav.employer.fieldService'),
      icon: FiTruck,
      path: '/employer/field-service'
    },
    {
      type: 'item',
      label: t('nav.employer.workplaces'),
      icon: FiMapPin,
      path: '/employer/workplaces'
    },
    {
      type: 'category',
      label: t('nav.employer.hrManagement')
    },
    {
      type: 'item',
      label: t('nav.employer.roles'),
      icon: FiUsers,
      path: '/employer/roles'
    },
    {
      type: 'item',
      label: t('nav.employer.team'),
      icon: FiUserCheck,
      path: '/employer/workforce-management'
    },
    {
      type: 'item',
      label: t('nav.employer.liveAttendance'),
      icon: FiClock,
      path: '/employer/live-attendance'
    },
    {
      type: 'item',
      label: t('nav.employer.timeOff'),
      icon: FiSun,
      path: '/employer/time-off'
    },
    {
      type: 'category',
      label: t('nav.employer.finances')
    },
    {
      type: 'item',
      label: t('nav.employer.timesheets'),
      icon: FiFileText,
      path: '/employer/timesheets'
    },
    {
      type: 'item',
      label: t('nav.employer.payroll'),
      icon: FiDollarSign,
      path: '/employer/payroll'
    },
    {
      type: 'item',
      label: t('nav.employer.payrollExport'),
      icon: FiUploadCloud,
      path: '/employer/payroll-export'
    },
    {
      type: 'item',
      label: t('nav.employer.payrollSync'),
      icon: FiRefreshCw,
      path: '/employer/payroll-sync'
    },
    {
      type: 'item',
      label: t('nav.employer.invoices'),
      icon: FiCreditCard,
      path: '/employer/invoices'
    },
    {
      type: 'category',
      label: t('nav.employer.compliance')
    },
    {
      type: 'item',
      label: t('nav.employer.insurance'),
      icon: FiUploadCloud,
      path: '/employer/insurance'
    },
    {
      type: 'item',
      label: t('nav.employer.jurisdictions'),
      icon: FiGlobe,
      path: '/employer/jurisdiction-settings'
    },
    {
      type: 'category',
      label: t('nav.employer.support')
    },
    {
      type: 'item',
      label: t('nav.employer.helpAndSupport'),
      icon: FiHelpCircle,
      path: '/employer/support'
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
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg whitespace-nowrap">
                  HR Bank
                </span>
                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full w-fit">
                  BETA
                </span>
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
                  {/* Fixed-size icon container */}
                  <Icon 
                    size={20} 
                    className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
                  />
                  
                  {/* Text - only render when expanded */}
                  {showExpanded && (
                    <span className="ml-3 text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                  
                  {/* Chevron for active state */}
                  {active && showExpanded && (
                    <FiChevronRight size={16} className="text-white ml-auto flex-shrink-0" />
                  )}

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

        {/* Footer - Language & Toggle */}
        <div className="border-t border-gray-700/50 p-4 space-y-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="w-full flex items-center p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
            >
              <FiGlobe size={20} className="flex-shrink-0" />
              {showExpanded && (
                <>
                  <span className="ml-3 text-sm">{LANGUAGES[language]?.flag} {LANGUAGES[language]?.nativeName}</span>
                  <FiChevronRight size={14} className={`ml-auto transition-transform ${showLangMenu ? 'rotate-90' : ''}`} />
                </>
              )}
            </button>
            
            {showLangMenu && showExpanded && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 max-h-48 overflow-y-auto">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => { setLanguage(code); setShowLangMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                      language === code ? 'text-[#ff5f00] bg-gray-700/50' : 'text-gray-300'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Button */}
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
