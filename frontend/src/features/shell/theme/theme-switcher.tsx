import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon } from 'lucide-react'

import { cn } from '../../../lib/cn'
import { useTheme } from './theme-context'

/** Jedno stabilno dugme: pritisnuto znači tamni režim; ikona prikazuje aktivni režim. */
export const ThemeSwitcher = ({ className }: { className?: string }) => {
  const { t } = useTranslation()
  const { choice, setChoice, skin } = useTheme()
  const statusId = useId()
  const [announcement, setAnnouncement] = useState('')
  const isDark = choice === 'aurum-dark'

  if (skin === 'classic') return null

  return (
    <div className={cn('flex items-center', className)}>
      <button
        type="button"
        aria-label={t('shell.theme.darkToggle')}
        aria-pressed={isDark}
        onClick={() => {
          const next = isDark ? 'aurum-light' : 'aurum-dark'
          setChoice(next)
          setAnnouncement(t('shell.theme.announcement', { theme: t(isDark ? 'shell.theme.aurumLight' : 'shell.theme.aurumDark') }))
        }}
        className="min-h-target min-w-target inline-flex items-center justify-center rounded-full border border-control-border bg-surface text-content hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <span className="theme-switcher-icon" key={isDark ? 'dark' : 'light'}>
          {isDark ? <Moon aria-hidden="true" size={19} /> : <Sun aria-hidden="true" size={19} />}
        </span>
      </button>
      <p id={statusId} role="status" aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  )
}
