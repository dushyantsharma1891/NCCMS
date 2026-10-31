import React, { createContext, useContext, useState } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext(null);

// Exactly three supported languages, cycled in this fixed order.
const LANGS = ['en', 'hi', 'hinglish'];

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem('nccms_lang');
    return LANGS.includes(stored) ? stored : 'en';
  });

  const toggleLang = () => {
    setLang((l) => {
      const next = LANGS[(LANGS.indexOf(l) + 1) % LANGS.length];
      localStorage.setItem('nccms_lang', next);
      return next;
    });
  };

  const t = (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  return <LanguageContext.Provider value={{ lang, toggleLang, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
