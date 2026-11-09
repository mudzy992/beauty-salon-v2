import { Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'

import { RouteLoadingFallback } from '../app/route-loading-fallback'
import { AnalyticsTabNav, isAnalyticsTab, type AnalyticsTab } from '../features/analytics/analytics-tab-nav'

/**
 * M1 (Q3 + Q7) — `/admin/analytics` hub sa `?tab=`.
 *
 * Q7: „`client-analytics` / `stylist-analytics` postaju tabovi unutar
 * `/admin/analytics` (posljedica Q3/M1); stare rute redirectuju."
 *
 * Stare rute redirectuju preko `TabRedirect`, koji **čuva** `?userId=`,
 * `?stylistId=`, `?fromDate=` i `?toDate=` — na te deep linkove se oslanjaju
 * `features/daily-log/entry-table.tsx` (201, 238),
 * `features/dashboard/recent-reservations.tsx` (62) i `pages/Analytics.tsx` (396).
 *
 * Moduli ostaju u svojim `pages/*.tsx` jer ih `admin-analytics-i18n`,
 * `client-analytics-i18n` i `analytics-a11y` čitaju po putanji.
 */
const Analytics = lazy(() => import('./Analytics'))
const ClientAnalytics = lazy(() => import('./ClientAnalytics'))
const StylistAnalytics = lazy(() => import('./StylistAnalytics'))

const PANELS = {
  overview: Analytics,
  clients: ClientAnalytics,
  stylists: StylistAnalytics,
} as const

export default function AnalyticsHub() {
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  // type guard sužava tip; bez toga ternary proširi na `string` i PANELS[tab]
  // postane implicitno `any` (TS7053) — ista zamka kao u SettingsHub.
  const tab: AnalyticsTab = isAnalyticsTab(requested) ? requested : 'overview'
  const Panel = PANELS[tab]

  return (
    <div className="space-y-6">
      <AnalyticsTabNav />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Panel />
      </Suspense>
    </div>
  )
}
