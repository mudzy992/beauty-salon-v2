export const APP_LOCALE_KEY = 'APP_LOCALE'
export const DEFAULT_APP_LANGUAGE = 'bs'

export const normalizeAppLanguage = (language) => {
  const value = typeof language === 'string' ? language.trim().toLowerCase() : ''
  const baseLanguage = value.split(/[-_]/, 1)[0]
  return baseLanguage === 'en' ? 'en' : DEFAULT_APP_LANGUAGE
}

export const readAppLanguage = (storage) => {
  try {
    return normalizeAppLanguage(storage?.getItem(APP_LOCALE_KEY))
  } catch {
    return DEFAULT_APP_LANGUAGE
  }
}

export const persistAppLanguage = (language, storage) => {
  const normalizedLanguage = normalizeAppLanguage(language)
  try {
    storage?.setItem(APP_LOCALE_KEY, normalizedLanguage)
  } catch {
    // Keep the in-memory language switch usable when browser storage is blocked.
  }
  return normalizedLanguage
}

export const createI18nOptions = (language, resources) => ({
  resources,
  lng: normalizeAppLanguage(language),
  fallbackLng: DEFAULT_APP_LANGUAGE,
  interpolation: { escapeValue: false },
})
