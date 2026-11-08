import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

import { cn } from '../../../../lib/cn'

type StatCardProps = {
  label: string
  value: ReactNode
  /** Kratko pojašnjenje ispod vrijednosti (npr. period ili izvor podatka). */
  hint?: string
  /**
   * Trend. WCAG 1.4.1 — smjer nikad nije samo boja: uvijek ide strelica **i**
   * tekstualna oznaka.
   */
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  icon?: ReactNode
  className?: string
}

const trendIcon = { up: ArrowUp, down: ArrowDown, flat: Minus } as const

const trendClass = {
  up: 'text-ok-foreground',
  down: 'text-bad-foreground',
  flat: 'text-content-muted',
} as const

export const StatCard = ({ label, value, hint, trend, icon, className }: StatCardProps) => {
  const TrendIcon = trend ? trendIcon[trend.direction] : null

  return (
    <div
      data-admin-card
      className={cn('rounded-lg border border-line bg-surface p-4', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-content-muted">{label}</p>
        {icon ? (
          <span aria-hidden className="shrink-0 text-content-muted">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-content">{value}</p>
      {trend && TrendIcon ? (
        <p className={cn('mt-1 flex items-center gap-1 text-xs', trendClass[trend.direction])}>
          <TrendIcon aria-hidden className="h-3.5 w-3.5" />
          <span>{trend.label}</span>
        </p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-content-muted">{hint}</p> : null}
    </div>
  )
}
