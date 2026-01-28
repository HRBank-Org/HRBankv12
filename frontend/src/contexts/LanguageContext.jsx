import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from '../i18n/translations.json';

const LanguageContext = createContext();

// Supported languages
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', rtl: false },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false }
};

// Detect browser language
const getBrowserLanguage = () => {
  const browserLang = navigator.language?.split('-')[0] || 'en';
  return LANGUAGES[browserLang] ? browserLang : 'en';
};

// Get stored language or detect from browser
const getInitialLanguage = () => {
  const stored = localStorage.getItem('language');
  if (stored && LANGUAGES[stored]) {
    return stored;
  }
  return getBrowserLanguage();
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(getInitialLanguage);

  // Update localStorage when language changes
  const setLanguage = (lang) => {
    if (LANGUAGES[lang]) {
      localStorage.setItem('language', lang);
      setLanguageState(lang);
      // Update HTML lang attribute for accessibility
      document.documentElement.lang = lang;
    }
  };

  // Set initial HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, []);

  // Translation function
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Key not found, try English fallback
        value = translations['en'];
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object') {
            value = value[fallbackKey];
          } else {
            return key; // Return key if not found in fallback either
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters like {name} with actual values
    return value.replace(/\{(\w+)\}/g, (match, paramName) => {
      return params[paramName] !== undefined ? params[paramName] : match;
    });
  };

  const value = {
    language,
    setLanguage,
    t,
    languages: LANGUAGES,
    isRTL: LANGUAGES[language]?.rtl || false
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
