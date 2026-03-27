import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { LOGOS } from '../../utils/logoUtils';
import LanguageSelector from '../common/LanguageSelector';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Shared navigation header for all landing pages
 * Ensures consistent styling and prevents layout shifts
 */
const LandingHeader = ({ onSignInClick }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useLanguage();

  const navItems = [
    { path: '/', label: 'WorkPassport\u2122', exact: true },
    { path: '/institutions', label: t('landing.forInstitutions') },
    { path: '/employers', label: t('landing.forEmployers'), badge: 'Beta' },
    { path: '/jobs', label: t('workpassport.jobs') },
  ];

  const isActive = (item) => {
    if (item.exact) {
      return currentPath === item.path;
    }
    return currentPath.startsWith(item.path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <img src={LOGOS.master} alt="HR Bank" className="h-10 w-auto" />
          </Link>

          {/* Navigation Links - Fixed width to prevent layout shift */}
          <div className="hidden md:flex items-center gap-5">
            {navItems.map((item) => {
              const active = isActive(item);
              const isEmployers = item.path === '/employers';
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    relative font-medium text-sm whitespace-nowrap transition-colors
                    ${active 
                      ? isEmployers 
                        ? 'text-[#ff5f00]' 
                        : 'text-[#30496d]'
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <span className={active ? 'font-semibold' : ''}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="ml-1 text-[10px] text-orange-500 font-medium">
                      ({item.badge})
                    </span>
                  )}
                  {/* Active indicator line */}
                  {active && (
                    <span 
                      className={`absolute -bottom-[18px] left-0 right-0 h-0.5 ${
                        isEmployers ? 'bg-[#ff5f00]' : 'bg-[#30496d]'
                      }`}
                    />
                  )}
                </Link>
              );
            })}
            
            {/* Language Selector - Fixed width container */}
            <div className="w-[70px] flex-shrink-0">
              <LanguageSelector variant="compact" />
            </div>
          </div>

          {/* Sign In Button */}
          <Button 
            variant="ghost" 
            onClick={onSignInClick} 
            className="text-gray-700 hover:text-gray-900 font-medium"
            data-testid="landing-signin"
          >
            {t('auth.login')}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default LandingHeader;
