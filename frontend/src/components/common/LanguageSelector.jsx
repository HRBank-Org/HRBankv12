import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, LANGUAGES } from '../../contexts/LanguageContext';
import { FiGlobe, FiChevronDown, FiCheck } from 'react-icons/fi';

const LanguageSelector = ({ variant = 'default', className = '' }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES[language];

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          aria-label="Select language"
        >
          <span>{currentLang.flag}</span>
          <span className="hidden sm:inline">{language.toUpperCase()}</span>
          <FiChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
            {Object.entries(LANGUAGES).map(([code, lang]) => (
              <button
                key={code}
                onClick={() => {
                  setLanguage(code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  language === code ? 'text-cyan-600 bg-cyan-50' : 'text-gray-700'
                }`}
              >
                <span>{lang.flag}</span>
                <span className="flex-1 text-left">{lang.nativeName}</span>
                {language === code && <FiCheck size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default full variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        aria-label="Select language"
      >
        <FiGlobe size={18} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{currentLang.nativeName}</span>
        <FiChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Select Language
          </div>
          {Object.entries(LANGUAGES).map(([code, lang]) => (
            <button
              key={code}
              onClick={() => {
                setLanguage(code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                language === code ? 'text-cyan-600 bg-cyan-50' : 'text-gray-700'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{lang.nativeName}</div>
                <div className="text-xs text-gray-400">{lang.name}</div>
              </div>
              {language === code && <FiCheck size={16} className="text-cyan-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
