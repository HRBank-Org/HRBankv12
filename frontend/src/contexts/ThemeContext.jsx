import React, { createContext, useContext, useMemo, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = {
  workforce: {
    name: 'workforce',
    logo: 'https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/pz2plcbj_HRB%20App%20Icon%20Workforce.jpg',
    primaryColor: '#30496d',
    accentColor: '#10B981',
    bgColor: '#F8FAFC',
    displayName: 'Workforce'
  },
  employer: {
    name: 'employer',
    logo: 'https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/44b0k6s6_HRB%20App%20Icon%20Employer.jpg',
    primaryColor: '#ff5f00',
    accentColor: '#2563EB',
    bgColor: '#FFF8F5',
    displayName: 'Employer'
  },
  institution: {
    name: 'institution',
    logo: 'https://customer-assets.emergentagent.com/job_bankclone-debug/artifacts/5pr4pboq_HR%20Bank%20Institutions.jpg',
    primaryColor: '#1F2937',
    accentColor: '#3B82F6',
    bgColor: '#F9FAFB',
    displayName: 'Institution'
  }
};

export const ThemeProvider = ({ children, userType = 'workforce' }) => {
  const theme = useMemo(() => THEMES[userType] || THEMES.workforce, [userType]);
  
  useEffect(() => {
    document.body.className = `theme-${theme.name}`;
    document.body.style.backgroundColor = theme.bgColor;
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};