import { useState, useEffect } from 'react';
import { i18n } from '@k8-games/sdk';

export const useTranslations = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    try {
      return i18n.getLanguage() || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      // Listen for language changes from the SDK
      const handleLanguageChange = (lang: string) => {
        setCurrentLanguage(lang);
        // Update document language for a11y and screen readers
        if (typeof document !== 'undefined') {
          document.documentElement.lang = lang;
        }
      };

      // Set up the listener
      i18n.onLanguageChanged(handleLanguageChange);

      // Set initial document language
      if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLanguage;
      }
    } catch (error) {
      console.error('Error setting up i18n listener:', error);
    }
  }, [currentLanguage]);

  const t = (key: string, returnObject = false) => {
    try {
      // Use the SDK's translation function with returnObjects option
      if (returnObject) {
        const value = i18n.t(key, { returnObjects: true });
        return value;
      } else {
        const value = i18n.t(key);
        return value;
      }
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return key;
    }
  };

  const setLanguage = (lang: string) => {
    try {
      i18n.setLanguage(lang);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  return { t, currentLanguage, setCurrentLanguage: setLanguage };
};
