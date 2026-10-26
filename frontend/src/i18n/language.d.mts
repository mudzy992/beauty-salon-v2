export type AppLanguage = 'bs' | 'en'

export const APP_LOCALE_KEY: string
export const DEFAULT_APP_LANGUAGE: AppLanguage

export function normalizeAppLanguage(language: unknown): AppLanguage
export function readAppLanguage(storage?: Pick<Storage, 'getItem'> | null): AppLanguage
export function persistAppLanguage(
  language: unknown,
  storage?: Pick<Storage, 'setItem'> | null,
): AppLanguage
export function createI18nOptions<T>(
  language: unknown,
  resources: T,
): {
  resources: T
  lng: AppLanguage
  fallbackLng: AppLanguage
  interpolation: { escapeValue: false }
}
