import type { ReactNode } from 'react'

import { cn } from '../../../../lib/cn'

type FormSectionProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/**
 * Grupisanje povezanih polja u formi.
 *
 * WCAG 1.3.1 / 3.3.2 — `fieldset` + `legend` daje programski i čitljiv naziv
 * grupe, pa čitači ekrana najavljuju grupu uz svako polje unutar nje.
 * Zamjena za `<div>` + `<h3>`, koji ne nose tu semantiku.
 */
export const FormSection = ({ title, description, children, className }: FormSectionProps) => (
  <fieldset className={cn('rounded-lg border border-line bg-surface p-4', className)}>
    <legend className="px-1 text-sm font-semibold text-content">{title}</legend>
    {description ? (
      <p className="mb-3 max-w-prose text-xs text-content-muted">{description}</p>
    ) : null}
    <div className="space-y-4">{children}</div>
  </fieldset>
)
