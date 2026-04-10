import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations from '../i18n/translations.json';
import api from '../utils/api';

const LanguageContext = createContext();

// Supported languages
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', rtl: false },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', rtl: false },
  tl: { name: 'Tagalog', nativeName: 'Tagalog', flag: '🇵🇭', rtl: false },
  ur: { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true },
  fa: { name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', rtl: true },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', rtl: false },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷', rtl: false },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', rtl: false },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', rtl: false },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', rtl: false },
  bn: { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', rtl: false },
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', rtl: false }
};

// Detect browser language — supports both simple (fr) and regional (zh-CN, zh-HK) codes
const getBrowserLanguage = () => {
  const fullLang = navigator.language || 'en';
  const baseLang = fullLang.split('-')[0];
  // Check full code first for regional variants (zh-CN → zh), then base
  if (LANGUAGES[fullLang]) return fullLang;
  if (LANGUAGES[baseLang]) return baseLang;
  return 'en';
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

  // Update localStorage and document direction when language changes
  const setLanguage = (lang) => {
    if (LANGUAGES[lang]) {
      localStorage.setItem('language', lang);
      setLanguageState(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = LANGUAGES[lang].rtl ? 'rtl' : 'ltr';
    }
  };

  // Sync language preference to backend profile (call after login)
  const syncLanguageToBackend = useCallback(async (lang) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      await api.put('/api/users/preferred-language', { preferred_language: lang || language });
    } catch (err) {
      // Silent fail — non-critical
    }
  }, [language]);

  // Set initial HTML lang and direction attributes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = LANGUAGES[language]?.rtl ? 'rtl' : 'ltr';
  }, [language]);

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
    syncLanguageToBackend,
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
