import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { bs } from './bs';

i18n.use(initReactI18next).init({
  resources: {
    bs: { translation: bs },
  },
  lng: 'bs',
  fallbackLng: 'bs',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
