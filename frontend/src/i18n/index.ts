import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import bs from './locales/bs.json'
import en from './locales/en.json'
import {
  createI18nOptions,
  persistAppLanguage,
  readAppLanguage,
  type AppLanguage,
} from './language.mjs'

const resources = {
  bs: { translation: bs },
  en: { translation: en },
} as const

const getLocalStorage = () => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

const initialLanguage = readAppLanguage(getLocalStorage())

i18n.use(initReactI18next).init(createI18nOptions(initialLanguage, resources))

export const setAppLanguage = async (lng: AppLanguage) => {
  const normalizedLanguage = persistAppLanguage(lng, getLocalStorage())
  await i18n.changeLanguage(normalizedLanguage)
}

export default i18n
