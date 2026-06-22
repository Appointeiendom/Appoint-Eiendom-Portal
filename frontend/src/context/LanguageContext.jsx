import { createContext, useContext, useState } from 'react';
import no from '../locales/no';
import en from '../locales/en';

const translations = { no, en };
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'no');

  const toggleLang = () => {
    const next = lang === 'no' ? 'en' : 'no';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  const t = (key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) val = val?.[k];
    return val || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
