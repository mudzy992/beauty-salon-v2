import type { ReactNode } from 'react'

import { cn } from '../../../../lib/cn'

type FormSectionProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/**
 * NEJRA §11 — `fieldset` + `legend` daje programski i čitljiv naziv grupe
 * (WCAG 1.3.1 / 3.3.2), pa čitač ekrana najavljuje grupu uz svako polje.
 * `aurum-heading` mijenja font samo u Aurum stanjima.
 */
export const FormSection = ({ title, description, children, className }: FormSectionProps) => (
  <fieldset
    data-aurum-card
    className={cn('rounded-lg border border-line bg-surface p-4', className)}
  >
    <legend className="aurum-heading px-1 text-sm font-semibold text-content">{title}</legend>
    {description ? (
      <p className="mb-3 max-w-prose text-xs text-content-muted">{description}</p>
    ) : null}
    <div className="space-y-4">{children}</div>
  </fieldset>
)
