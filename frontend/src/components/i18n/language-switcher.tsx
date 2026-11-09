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
  // WCAG 2.5.3 Label in Name: vidljivi tekst ("BS"/"EN") MORA biti dio pristupačnog imena,
  // inače čitač ekrana najavi drugo ime nego što korisnik vidi (axe: label-content-name-mismatch).
  const visibleCode = currentLanguage.toUpperCase()
  // `aria-label` preglasava `title` u računanju pristupačnog imena, pa `title` ostaje
  // NEPROMIJENJEN — tooltip na javnom sajtu izgleda identično (DoD faze 13, t. 64).
  const accessibleName = `${visibleCode} — ${actionLabel}`

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-9 min-w-10 px-2 font-semibold ${className}`}
      aria-label={accessibleName}
      title={actionLabel}
      onClick={() => void setAppLanguage(nextLanguage)}
    >
      {visibleCode}
    </Button>
  )
}
