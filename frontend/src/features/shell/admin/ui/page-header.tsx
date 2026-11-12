import type { ReactNode } from 'react'

import { cn } from '../../../../lib/cn'

type PageHeaderProps = {
  /** Jedini `<h1>` na stranici (WCAG 2.4.6 Headings and labels). */
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

/**
 * Zaglavlje admin/stylist stranice.
 *
 * Namjerno je običan `div`, ne `<header>`: `<header>` unutar `<main>` je
 * generička regija, a landmark strukturu već drže shell-ovi. Naslov ostaje
 * jedini `<h1>` na stranici.
 */
export const PageHeader = ({ title, description, actions, className }: PageHeaderProps) => (
  <div
    data-admin-page-header
    className={cn(
      'mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between',
      className,
    )}
  >
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold text-content">{title}</h1>
      {description ? (
        <p className="mt-1 max-w-prose text-sm text-content-muted">{description}</p>
      ) : null}
    </div>
    {actions ? (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    ) : null}
  </div>
)
