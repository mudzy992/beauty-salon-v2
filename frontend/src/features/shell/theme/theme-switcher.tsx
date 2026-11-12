import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sun, Moon } from 'lucide-react'

import { cn } from '../../../lib/cn'
import { useTheme } from './theme-context'
import type { ThemeChoice } from './theme-context'

/** Samo Aurum svijetla/tamna; aktivni identitet bira administrator. */
const CHOICES: { value: ThemeChoice; labelKey: string }[] = [
  { value: 'aurum-light', labelKey: 'shell.theme.aurumLight' },
  { value: 'aurum-dark', labelKey: 'shell.theme.aurumDark' },
]

/**
 * Jedan izbornik teme za sve shellove.
 *
 * Ikonice su dekorativne; tekstualno pristupačno ime dolazi iz i18n.
 * WCAG 4.1.3 — promjena se najavljuje u `role="status"`, bez pomicanja fokusa.
 * WCAG 2.5.8 — `min-h-target min-w-target` = 44 px meta.
 * WCAG 2.3.3 — nema transitions/animacija; globalni `prefers-reduced-motion`
 * blok u `globals.css` ostaje jedini vlasnik kretanja.
 * Fokus ostaje na kliknutom dugmetu: nema `autoFocus`, `.focus()`, ni promjene `key`.
 */
export const ThemeSwitcher = ({ className }: { className?: string }) => {
  const { t } = useTranslation()
  const { choice, setChoice, skin } = useTheme()
  const statusId = useId()
  const [announcement, setAnnouncement] = useState('')

  if (skin === 'classic') return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <div
        role="group"
        aria-label={t('shell.theme.groupLabel')}
        className="flex flex-wrap items-center gap-1"
      >
        {CHOICES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={choice === option.value}
            onClick={() => {
              setChoice(option.value)
              setAnnouncement(t('shell.theme.announcement', { theme: t(option.labelKey) }))
            }}
            className={cn(
              'min-h-target min-w-target inline-flex items-center justify-center rounded-md border border-control-border px-3 text-xs font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
              choice === option.value
                ? 'bg-nav-active text-brand-rose-text'
                : 'bg-surface text-content hover:bg-surface-muted',
            )}
          >
            {option.value === 'aurum-light' ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
            <span className="sr-only">{t(option.labelKey)}</span>
          </button>
        ))}
      </div>
      <p id={statusId} role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
