import { Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'

import { RouteLoadingFallback } from '../app/route-loading-fallback'
import { SettingsTabNav, isSettingsTab, type SettingsTab } from '../features/settings/settings-tab-nav'

/**
 * M2 (Q3) — `/admin/settings` hub sa `?tab=`.
 *
 * Sedam modula na jednoj ruti; stare rute (`settings/operations`,
 * `settings/appearance`, `settings/seo`, `email-settings`, `notifications`,
 * `app-releases`) redirectuju ovamo preko `TabRedirect`, koji čuva postojeće
 * query parametre.
 *
 * Moduli ostaju u svojim `pages/*.tsx` fajlovima jer 13 testova čita te fajlove
 * po putanji i asertuje njihov sadržaj (mape copy-ključeva, API izraze).
 *
 * `lazy` + `Suspense` su obavezni: `EmailSettings.tsx` ima 1377 linija i ne smije
 * ući u settings chunk. Router-ov `withSuspense` pokriva samo elemente ruta,
 * ne i komponente unutar njih.
 */
const Settings = lazy(() => import('./Settings'))
const SettingsOperations = lazy(() => import('./SettingsOperations'))
const SettingsAppearance = lazy(() => import('./SettingsAppearance'))
const SettingsSeo = lazy(() => import('./SettingsSeo'))
const EmailSettings = lazy(() => import('./EmailSettings'))
const Notifications = lazy(() => import('./Notifications'))
const AppReleases = lazy(() => import('./AppReleases'))

/**
 * Prva četiri taba renderuju `SettingsModulePage` → `SettingsShell`, koji već
 * sadrži `SettingsTabNav`. Preostala tri imaju sopstveni layout, pa se nav
 * dodaje ovdje — inače s tih tabova ne bi bilo načina da se ode na ostale.
 */
const PANELS = {
  site: { Component: Settings, wrap: false },
  operations: { Component: SettingsOperations, wrap: false },
  appearance: { Component: SettingsAppearance, wrap: false },
  seo: { Component: SettingsSeo, wrap: false },
  email: { Component: EmailSettings, wrap: true },
  notifications: { Component: Notifications, wrap: true },
  releases: { Component: AppReleases, wrap: true },
} as const

export default function SettingsHub() {
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  // type guard sužava `requested` na SettingsTab; bez toga ternary proširi tip
  // na `string` i PANELS[tab] postane implicitno `any` (TS7053).
  const tab: SettingsTab = isSettingsTab(requested) ? requested : 'site'
  const { Component, wrap } = PANELS[tab]

  const panel = (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Component />
    </Suspense>
  )

  return wrap ? (
    <div className="w-full space-y-6 pb-10">
      <SettingsTabNav />
      {panel}
    </div>
  ) : (
    panel
  )
}
