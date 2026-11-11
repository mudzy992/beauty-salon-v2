import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../components/ui/button'
import { cn } from '../../../../lib/cn'

type FilterBarProps = {
  /** Kontrole filtera; svaka mora imati vidljiv `<label>` (WCAG 3.3.2). */
  children: ReactNode
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  onReset?: () => void
  resultSummary?: string
  className?: string
}

/**
 * NEJRA §11 — `role="search"` landmark s imenom, `role="status"` za broj
 * rezultata (WCAG 4.1.3, bez pomicanja fokusa). Samo semantički tokeni.
 */
export const FilterBar = ({
  children,
  onSubmit,
  onReset,
  resultSummary,
  className,
}: FilterBarProps) => {
  const { t } = useTranslation()

  return (
    <form
      role="search"
      aria-label={t('table.filterResults')}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(event)
      }}
      data-aurum-card
      className={cn('mb-4 rounded-lg border border-line bg-surface p-3', className)}
    >
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-xs text-content-muted">
          {resultSummary}
        </p>
        <div className="flex items-center gap-2">
          {onReset ? (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              {t('table.clearFilters')}
            </Button>
          ) : null}
          <Button type="submit" variant="outline" size="sm">
            {t('common.filter')}
          </Button>
        </div>
      </div>
    </form>
  )
}
