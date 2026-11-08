import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

export type SummaryItem = {
  label: string
  value: number
  hint?: string
  tone?: 'default' | 'positive' | 'negative' | 'muted'
}

const toneClass: Record<NonNullable<SummaryItem['tone']>, string> = {
  default: 'text-content',
  positive: 'text-ok-foreground',
  negative: 'text-bad-foreground',
  muted: 'text-content-strong',
}

export function SummaryCards({ items }: { items: SummaryItem[] }) {
  const { i18n } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-line bg-surface p-3"
        >
          <div className="text-xs text-content-muted">
            {item.label}
          </div>
          <div
            className={`mt-1 text-base font-semibold tabular-nums ${
              toneClass[item.tone ?? 'default']
            }`}
          >
            {formatLocalizedAmount(item.value, i18n.language)}
          </div>
          {item.hint ? (
            <div className="mt-0.5 text-xs text-content-muted">{item.hint}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
