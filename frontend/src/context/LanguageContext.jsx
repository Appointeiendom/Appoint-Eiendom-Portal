import { createContext, useContext, useState } from 'react';
import no from '../locales/no';
import en from '../locales/en';

const translations = { no, en };
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => sessionStorage.getItem('lang') || 'no');

  const setLang = (val) => {
    setLangState(val);
    sessionStorage.setItem('lang', val);
  };

  const toggleLang = () => setLang(lang === 'no' ? 'en' : 'no');

  const t = (key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) val = val?.[k];
    return val || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
