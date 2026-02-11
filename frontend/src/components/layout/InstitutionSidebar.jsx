import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage, LANGUAGES } from '../../contexts/LanguageContext';
import {
  Home, GraduationCap, Award, FileText, Users, 
  Settings, CreditCard, Globe, ChevronRight, ChevronLeft,
  BookOpen, Upload, Bell, Wallet, TrendingUp, 
  UserPlus, ClipboardList, BarChart3, ShoppingBag
} from 'lucide-react';

// Convert LANGUAGES object to array for iteration
const languageList = Object.entries(LANGUAGES).map(([code, data]) => ({
  code,
  ...data
}));

const InstitutionSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { language, setLanguage } = useLanguage();
  
  const showExpanded = isExpanded || hovering;

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', showExpanded ? '260px' : '70px');
  }, [showExpanded]);

  const menuItems = [
    {
      type: 'item',
      label: 'Dashboard',
      icon: Home,
      path: '/institution/dashboard'
    },
    {
      type: 'category',
      label: 'Programs'
    },
    {
      type: 'item',
      label: 'All Programs',
      icon: GraduationCap,
      path: '/institution/programs'
    },
    {
      type: 'item',
      label: 'Cohorts',
      icon: BookOpen,
      path: '/institution/classes'
    },
    {
      type: 'item',
      label: 'Templates',
      icon: ClipboardList,
      path: '/institution/templates'
    },
    {
      type: 'category',
      label: 'Credentials'
    },
    {
      type: 'item',
      label: 'Issue Credential',
      icon: Award,
      path: '/institution/credentials/issue'
    },
    {
      type: 'item',
      label: 'Manage Credentials',
      icon: FileText,
      path: '/institution/credentials'
    },
    {
      type: 'item',
      label: 'Verification Requests',
      icon: FileCheck,
      path: '/institution/verification-requests'
    },
    {
      type: 'item',
      label: 'Marketplace',
      icon: ShoppingBag,
      path: '/institution/marketplace'
    },
    {
      type: 'category',
      label: 'Students'
    },
    {
      type: 'item',
      label: 'Invite Students',
      icon: UserPlus,
      path: '/institution/students/invite'
    },
    {
      type: 'item',
      label: 'Transcripts',
      icon: FileText,
      path: '/institution/transcripts'
    },
    {
      type: 'category',
      label: 'Finance'
    },
    {
      type: 'item',
      label: 'Payouts',
      icon: Wallet,
      path: '/institution/payouts'
    },
    {
      type: 'item',
      label: 'Financial Summary',
      icon: BarChart3,
      path: '/institution/financials'
    },
    {
      type: 'item',
      label: 'Fundraisers',
      icon: TrendingUp,
      path: '/institution/fundraisers'
    },
    {
      type: 'category',
      label: 'Settings'
    },
    {
      type: 'item',
      label: 'Institution Settings',
      icon: Settings,
      path: '/institution/settings'
    },
    {
      type: 'item',
      label: 'Notifications',
      icon: Bell,
      path: '/institution/notifications'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div
      className="fixed left-0 top-0 h-full z-40 transition-all duration-300 flex flex-col"
      style={{
        width: showExpanded ? '260px' : '70px',
        backgroundColor: '#1a1a2e',
        borderRight: '1px solid rgba(255,255,255,0.1)'
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setShowLangMenu(false); }}
    >
      {/* Logo Header */}
      <div 
        className="h-16 flex items-center px-4 cursor-pointer border-b border-white/10"
        onClick={() => navigate('/institution/dashboard')}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.primaryColor}dd)` }}>
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        {showExpanded && (
          <div className="ml-3 overflow-hidden">
            <span className="text-white font-bold text-lg whitespace-nowrap">HR Bank</span>
            <p className="text-xs text-gray-400 whitespace-nowrap">Institution Portal</p>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200"
      >
        {isExpanded ? (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {menuItems.map((item, index) => {
          if (item.type === 'category') {
            return showExpanded ? (
              <div key={index} className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {item.label}
              </div>
            ) : (
              <div key={index} className="border-t border-white/10 my-2" />
            );
          }

          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={index}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all ${
                active 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                active ? 'bg-gradient-to-br' : 'bg-white/5'
              }`}
                style={active ? { background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.primaryColor}cc)` } : {}}>
                <Icon className={`w-4 h-4 ${active ? 'text-white' : ''}`} />
              </div>
              {showExpanded && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Language Selector */}
      <div className="p-2 border-t border-white/10">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            {showExpanded && (
              <>
                <span className="text-sm font-medium flex-1 text-left">
                  {LANGUAGES[language]?.flag} {LANGUAGES[language]?.name}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showLangMenu ? 'rotate-90' : ''}`} />
              </>
            )}
          </button>

          {showLangMenu && showExpanded && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-800 rounded-lg shadow-xl border border-white/10 py-1 max-h-48 overflow-y-auto">
              {languageList.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors ${
                    language === lang.code ? 'text-white bg-white/5' : 'text-gray-400'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstitutionSidebar;
