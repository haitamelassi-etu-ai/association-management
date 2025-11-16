import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation files
import translationAR from './locales/ar.json';
import translationFR from './locales/fr.json';
import translationEN from './locales/en.json';

const resources = {
  ar: { translation: translationAR },
  fr: { translation: translationFR },
  en: { translation: translationEN }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    lng: localStorage.getItem('language') || 'ar',
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;
