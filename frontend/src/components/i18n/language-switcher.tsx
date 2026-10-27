import { useTranslation } from 'react-i18next'

import { Button } from '../ui/button'
import { setAppLanguage } from '../../i18n'
import { normalizeAppLanguage, type AppLanguage } from '../../i18n/language.mjs'

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation()
  const currentLanguage = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language)
  const nextLanguage: AppLanguage = currentLanguage === 'bs' ? 'en' : 'bs'
  const targetLanguageName = t(`shell.languageNames.${nextLanguage}`)
  const actionLabel = t('shell.switchLanguageTo', { language: targetLanguageName })

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-9 min-w-10 px-2 font-semibold ${className}`}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={() => void setAppLanguage(nextLanguage)}
    >
      {currentLanguage.toUpperCase()}
    </Button>
  )
}
