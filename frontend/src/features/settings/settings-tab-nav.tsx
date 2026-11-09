import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Bell, Globe, Mail, Palette, Search, SlidersHorizontal, Smartphone } from 'lucide-react'

/**
 * Pod-navigacija postavki (M2 / D11 + D12).
 *
 * Sedam tabova na jednoj ruti `/admin/settings?tab=…`. `NavLink` ne može
 * poslužiti jer njegovo `isActive` gleda samo `pathname`, pa bi na
 * `/admin/settings` svih sedam linkova bilo „aktivno" istovremeno — aktivno
 * stanje se zato računa iz `?tab=`, a `aria-current` postavlja eksplicitno.
 */
export const SETTINGS_TABS = [
  'site',
  'operations',
  'appearance',
  'seo',
  'email',
  'notifications',
  'releases',
] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]

export const isSettingsTab = (value: string | null): value is SettingsTab =>
  !!value && (SETTINGS_TABS as readonly string[]).includes(value)

const ICONS = {
  site: Globe,
  operations: SlidersHorizontal,
  appearance: Palette,
  seo: Search,
  email: Mail,
  notifications: Bell,
  releases: Smartphone,
} as const

/** Zadnji tab nema `?tab=` u URL-u — isto pravilo kao `finance-page.tsx`. */
export const settingsTabHref = (tab: SettingsTab): string =>
  tab === 'site' ? '/admin/settings' : `/admin/settings?tab=${tab}`

export function SettingsTabNav() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const current = isSettingsTab(searchParams.get('tab')) ? searchParams.get('tab')! : 'site'

  return (
    <nav
      aria-label={t('adminSettings.navigationLabel')}
      className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4"
    >
      {SETTINGS_TABS.map((tab) => {
        const Icon = ICONS[tab]
        const isActive = tab === current
        return (
          <Link
            key={tab}
            to={settingsTabHref(tab)}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex min-h-[5.25rem] items-center gap-3 rounded-xl border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 sm:px-4 ${
              isActive
                ? 'border-brand-rose-ring bg-nav-active shadow-sm'
                : 'border-slate-200 bg-white hover:border-control-border hover:bg-surface-muted'
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? 'bg-brand-rose text-on-primary'
                  : 'bg-slate-100 text-slate-600 group-hover:bg-nav-active group-hover:text-content'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span
                className={`block text-sm font-semibold ${
                  isActive ? 'text-brand-rose-text' : 'text-slate-800'
                }`}
              >
                {t(`adminSettings.nav.${tab}`)}
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                {t(`adminSettings.navDescriptions.${tab}`)}
              </span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
