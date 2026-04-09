import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import bs from './locales/bs.json'
import en from './locales/en.json'

const APP_LOCALE_KEY = 'APP_LOCALE'

const resources = {
  bs: { translation: bs },
  en: { translation: en },
} as const

const initialLanguage =
  (localStorage.getItem(APP_LOCALE_KEY) || 'bs').toLowerCase() === 'en'
    ? 'en'
    : 'bs'

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'bs',
  interpolation: { escapeValue: false },
})

export const setAppLanguage = async (lng: 'bs' | 'en') => {
  localStorage.setItem(APP_LOCALE_KEY, lng)
  await i18n.changeLanguage(lng)
}

export default i18n
