import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome, FiCalendar, FiBriefcase, FiSearch, FiClock,
  FiFileText, FiSettings, FiCheckSquare, FiChevronRight,
  FiAward, FiDollarSign, FiSun, FiGlobe, FiHelpCircle,
  FiCreditCard, FiTruck, FiLock
} from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage, LANGUAGES } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const WorkforceSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [hasEmployment, setHasEmployment] = useState(null); // null = loading
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const showExpanded = isExpanded || hovering;

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', showExpanded ? '240px' : '70px');
  }, [showExpanded]);

  // Check employment status on mount
  useEffect(() => {
    const checkEmployment = async () => {
      try {
        const res = await api.get('/api/workforce/me/employment-status');
        setHasEmployment(res.data.data?.has_active_employment || false);
      } catch {
        setHasEmployment(false);
      }
    };
    checkEmployment();
  }, []);

  // Always-visible items (Mode 1: Building)
  const buildingItems = [
    { type: 'item', label: t('nav.workforce.dashboard'), icon: FiHome, path: '/workforce/dashboard' },
    { type: 'category', label: 'Credentials' },
    { type: 'item', label: 'My Credentials', icon: FiAward, path: '/workforce/credentials' },
    { type: 'item', label: t('nav.workforce.myProfiles'), icon: FiBriefcase, path: '/workforce/occupations' },
    { type: 'item', label: t('nav.workforce.workPassport'), icon: FiGlobe, path: '/workforce/work-passport' },
    { type: 'category', label: t('nav.workforce.career') },
    { type: 'item', label: t('nav.workforce.findJobs'), icon: FiSearch, path: '/workforce/find-jobs' },
    { type: 'item', label: 'Documents', icon: FiFileText, path: '/workforce/documents' },
  ];

  // Employment-only items (Mode 2: Employed)
  const employmentItems = [
    { type: 'category', label: t('nav.workforce.workAndSchedule') },
    { type: 'item', label: t('nav.workforce.mySchedule'), icon: FiCalendar, path: '/workforce/schedule' },
    { type: 'item', label: t('nav.workforce.performance'), icon: FiAward, path: '/workforce/performance' },
    { type: 'item', label: t('nav.workforce.attendance'), icon: FiClock, path: '/workforce/attendance' },
    { type: 'item', label: t('nav.workforce.myRoutes'), icon: FiTruck, path: '/workforce/routes' },
    { type: 'item', label: t('nav.workforce.availability'), icon: FiCheckSquare, path: '/workforce/availability' },
    { type: 'category', label: t('nav.workforce.earnings') },
    { type: 'item', label: t('nav.workforce.wallet'), icon: FiDollarSign, path: '/workforce/wallet' },
    { type: 'item', label: t('nav.workforce.timesheets'), icon: FiFileText, path: '/workforce/timesheets' },
    { type: 'item', label: t('nav.workforce.invoices'), icon: FiCreditCard, path: '/workforce/invoices' },
    { type: 'item', label: t('nav.workforce.timeOff'), icon: FiSun, path: '/workforce/time-off' },
  ];

  // Bottom items (always visible)
  const bottomItems = [
    { type: 'category', label: t('nav.workforce.support') },
    { type: 'item', label: 'Settings', icon: FiSettings, path: '/workforce/settings' },
    { type: 'item', label: t('nav.workforce.helpAndSupport'), icon: FiHelpCircle, path: '/workforce/support' },
  ];

  // Compose final menu
  const menuItems = hasEmployment
    ? [...buildingItems, ...employmentItems, ...bottomItems]
    : [...buildingItems, ...bottomItems];

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
    if (location.pathname.startsWith(item.path + '/')) return true;
    return false;
  };

  return (
    <div
      className="fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out"
      style={{ width: showExpanded ? '240px' : '70px' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="h-full flex flex-col relative" style={{ backgroundColor: '#1a1d29' }}>
        {/* Shadow */}
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset -8px 0 16px -8px rgba(0, 0, 0, 0.3)', zIndex: 1 }} />

        {/* Logo */}
        <div className="flex items-center justify-center h-20 border-b border-gray-700/50">
          <div className="flex items-center gap-3 px-4">
            <img
              src={theme.logo}
              alt="HR Bank"
              className="rounded-xl flex-shrink-0"
              style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', objectFit: 'contain' }}
            />
            {showExpanded && (
              <span className="text-white font-bold text-lg whitespace-nowrap">HR Bank</span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className={`flex-1 overflow-y-auto py-4 ${showExpanded ? 'px-3' : 'px-2'}`}>
          <div className="space-y-0.5">
            {menuItems.map((item, index) => {
              if (item.type === 'category') {
                return (
                  <div key={index} className="px-3 pt-5 pb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                  data-testid={`sidebar-${item.path?.split('/').pop()}`}
                  className={`
                    w-full flex items-center py-2.5 rounded-xl
                    transition-colors duration-200 group relative
                    ${showExpanded ? 'px-3 justify-start' : 'justify-center'}
                    ${active
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Icon size={20} className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                  {showExpanded && (
                    <span className="ml-3 text-sm font-medium whitespace-nowrap">{item.label}</span>
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

            {/* Employment Mode Teaser — only when NOT employed */}
            {hasEmployment === false && showExpanded && (
              <div className="mx-1 mt-6 p-4 bg-gradient-to-br from-blue-900/30 to-slate-800/40 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <FiLock size={14} className="text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Employment</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Schedule, earnings, timesheets and more unlock when you're hired by an employer on HR Bank.
                </p>
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-700/50 p-3 space-y-1">
          {/* Language */}
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
                      language === code ? 'text-blue-400 bg-gray-700/50' : 'text-gray-300'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
          >
            <FiChevronRight size={20} className={`transition-transform duration-300 ${showExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkforceSidebar;
