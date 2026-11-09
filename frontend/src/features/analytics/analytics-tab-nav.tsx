import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, TrendingUp, User } from 'lucide-react'

/**
 * M1 (Q3 + Q7) — pod-navigacija analitike.
 *
 * Q7: „`client-analytics` / `stylist-analytics` postaju tabovi unutar
 * `/admin/analytics`; stare rute redirectuju."
 *
 * `NavLink` ne može poslužiti jer njegovo `isActive` gleda samo `pathname`, pa
 * bi na `/admin/analytics` sva tri linka bila aktivna istovremeno — stanje se
 * računa iz `?tab=`, a `aria-current` postavlja eksplicitno.
 */
export const ANALYTICS_TABS = ['overview', 'clients', 'stylists'] as const

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]

export const isAnalyticsTab = (value: string | null): value is AnalyticsTab =>
  !!value && (ANALYTICS_TABS as readonly string[]).includes(value)

const ICONS = { overview: BarChart3, clients: User, stylists: TrendingUp } as const

/** Zadani tab nema `?tab=` u URL-u — isto pravilo kao `finance-page.tsx`. */
export const analyticsTabHref = (tab: AnalyticsTab): string =>
  tab === 'overview' ? '/admin/analytics' : `/admin/analytics?tab=${tab}`

export function AnalyticsTabNav() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const current: AnalyticsTab = isAnalyticsTab(requested) ? requested : 'overview'

  return (
    <nav aria-label={t('adminAnalytics.tabsLabel')} className="flex flex-wrap gap-2">
      {ANALYTICS_TABS.map((tab) => {
        const Icon = ICONS[tab]
        const isActive = tab === current
        return (
          <Link
            key={tab}
            to={analyticsTabHref(tab)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-target items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${
              isActive
                ? 'border-brand-rose-ring bg-nav-active font-semibold text-brand-rose-text'
                : 'border-slate-200 bg-surface text-content hover:border-control-border hover:bg-surface-muted'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(`adminAnalytics.tabs.${tab}`)}
          </Link>
        )
      })}
    </nav>
  )
}
