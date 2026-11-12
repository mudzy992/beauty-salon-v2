import { useTranslation } from 'react-i18next'
import { AppLogo } from '../../components/brand/app-logo'
import { UploadedBrandLogo } from '../../components/brand/uploaded-brand-logo'
import { LanguageSwitcher } from '../../components/i18n/language-switcher'
import { useSettings } from '../../context/SettingsContext'
import { useTheme } from '../shell/theme/theme-context'
import { ThemeSwitcher } from '../shell/theme/theme-switcher'

/** Shared brand and language/theme controls, above the auth and onboarding h1. */
export function AuthCardHeader({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const { skin } = useTheme()
  const title = getSetting('app_title', t('app.title'))
  const logoPath = getSetting('app_logo', '')
  const logoColor = skin === 'aurum' ? 'hsl(var(--text))' : getSetting('app_logo_svg_color', 'var(--brand-primary)')
  const textColor = skin === 'aurum' ? 'hsl(var(--text))' : getSetting('app_logo_text_color', 'var(--brand-primary)')

  return (
    <div
      data-aurum-card-header
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div data-auth-brand className="min-w-0">
        {logoPath.trim() ? (
          <UploadedBrandLogo logoPath={logoPath} word={title} svgColor={logoColor} textColor={textColor} />
        ) : (
          <AppLogo title={title} svgColor={logoColor} textColor={textColor} animated={false} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
    </div>
  )
}
