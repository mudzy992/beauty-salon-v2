import { formatMoney } from '../finance.utils'

export type SummaryItem = {
  label: string
  value: number
  hint?: string
  tone?: 'default' | 'positive' | 'negative' | 'muted'
}

const toneClass: Record<NonNullable<SummaryItem['tone']>, string> = {
  default: 'text-slate-900 dark:text-slate-50',
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-rose-600 dark:text-rose-400',
  muted: 'text-slate-600 dark:text-slate-300',
}

export function SummaryCards({ items }: { items: SummaryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
          <div
            className={`mt-1 text-base font-semibold tabular-nums ${
              toneClass[item.tone ?? 'default']
            }`}
          >
            {formatMoney(item.value)}
          </div>
          {item.hint ? (
            <div className="mt-0.5 text-[11px] text-slate-400">{item.hint}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
