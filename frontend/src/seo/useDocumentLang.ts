import { useEffect } from 'react'

import i18n from '../i18n'
import { site } from './site'

const normalizeLang = (lng: string): string => {
  const base = (lng || '').toLowerCase().split('-')[0] || site.defaultLocale
  return site.supportedLocales.includes(base as any) ? base : site.defaultLocale
}

export function useDocumentLang() {
  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.lang = normalizeLang(lng)
    }

    apply(i18n.language)
    i18n.on('languageChanged', apply)
    return () => {
      i18n.off('languageChanged', apply)
    }
  }, [])
}

