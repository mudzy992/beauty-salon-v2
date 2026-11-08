import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

import { cn } from '../../../../lib/cn'

export type StatTone = 'default' | 'ok' | 'warn' | 'bad' | 'info' | 'neutral'

export type StatCardProps = {
  label: string
  value: ReactNode
  /** Kratko pojašnjenje ispod vrijednosti (npr. period ili izvor podatka). */
  hint?: string
  /**
   * Trend. WCAG 1.4.1 — smjer nikad nije samo boja: uvijek ide strelica **i**
   * tekstualna oznaka.
   */
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  /** Semantički ton kartice. Boja je uvijek pratilac teksta, nikad jedini nosilac. */
  tone?: StatTone
  icon?: ReactNode
  className?: string
}

const trendIcon = { up: ArrowUp, down: ArrowDown, flat: Minus } as const

const trendClass = {
  up: 'text-ok-foreground',
  down: 'text-bad-foreground',
  flat: 'text-content-muted',
} as const

const toneContainer: Record<StatTone, string> = {
  default: 'border-line bg-surface',
  ok: 'border-ok bg-ok',
  warn: 'border-warn bg-warn',
  bad: 'border-bad bg-bad',
  info: 'border-info bg-info',
  neutral: 'border-neutral bg-neutral',
}

/** Tekst na toniranoj pozadini koristi upareni foreground (svi parovi ≥ 6.5:1). */
const toneText: Record<StatTone, string> = {
  default: 'text-content',
  ok: 'text-ok-foreground',
  warn: 'text-warn-foreground',
  bad: 'text-bad-foreground',
  info: 'text-info-foreground',
  neutral: 'text-neutral-foreground',
}

export const StatCard = ({
  label,
  value,
  hint,
  trend,
  tone = 'default',
  icon,
  className,
}: StatCardProps) => {
  const TrendIcon = trend ? trendIcon[trend.direction] : null

  return (
    <div
      data-admin-card
      className={cn('rounded-lg border p-4', toneContainer[tone], className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn('text-sm', toneText[tone])}>{label}</p>
        {icon ? (
          <span aria-hidden className={cn('shrink-0', toneText[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', toneText[tone])}>{value}</p>
      {trend && TrendIcon ? (
        <p className={cn('mt-1 flex items-center gap-1 text-xs', trendClass[trend.direction])}>
          <TrendIcon aria-hidden className="h-3.5 w-3.5" />
          <span>{trend.label}</span>
        </p>
      ) : null}
      {hint ? <p className={cn('mt-1 text-xs', toneText[tone])}>{hint}</p> : null}
    </div>
  )
}
