import React, { createContext, useContext, useEffect, useState } from 'react';
import { i18n } from '@k8-games/sdk';

interface LanguageContextType {
  currentLang: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(i18n.getLanguage());

  useEffect(() => {
    i18n.onLanguageChanged((lang) => {
      setCurrentLang(lang);
    });
  }, []);

  const setLanguage = (lang: string) => {
    i18n.setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ currentLang, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 