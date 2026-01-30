import { GameConfigManager, i18n } from '@k8-games/sdk';
import enTranslations from '../lang/en.json';
import esTranslations from '../lang/es.json';

export const initializeI18n = () => {
    i18n.init({
        resources: {
            en: {
                translation: enTranslations
            },
            es: {
                translation: esTranslations
            }
        },
        fallbackLng: 'en',
        debug: import.meta.env.NODE_ENV === 'development'
    });

    // Get language from URL
    const gameConfigManager = GameConfigManager.getInstance();
    const lang = gameConfigManager.get('lang') || 'en';
    if (lang) {
        i18n.setLanguage(lang);
    }
};