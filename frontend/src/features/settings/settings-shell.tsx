import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Globe, Palette, Search, Settings2, SlidersHorizontal } from 'lucide-react'

const links = [
  { to: '/admin/settings', key: 'site', icon: Globe },
  { to: '/admin/settings/operations', key: 'operations', icon: SlidersHorizontal },
  { to: '/admin/settings/appearance', key: 'appearance', icon: Palette },
  { to: '/admin/settings/seo', key: 'seo', icon: Search },
] as const

export function SettingsShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="relative isolate overflow-hidden rounded-2xl border border-[#eadfd5] bg-gradient-to-br from-white via-[#fffaf5] to-[#f7eee7] px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full border border-[#e6d5c7]/70" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-12 -z-10 h-48 w-48 rounded-full border border-[#e6d5c7]/50" />
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#49332d] text-white shadow-sm">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a624e]">
              {t('adminSettings.workspace')}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#382a25] sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#75645a] sm:text-base">{description}</p>
          </div>
        </div>
      </header>

      <nav aria-label={t('adminSettings.navigationLabel')} className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {links.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={key === 'site'}
            className={({ isActive }) =>
              `group flex min-h-[5.25rem] items-center gap-3 rounded-xl border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b735f] focus-visible:ring-offset-2 sm:px-4 ${
                isActive
                  ? 'border-[#9d735d] bg-[#fffaf6] shadow-sm'
                  : 'border-slate-200 bg-white hover:border-[#d9c4b5] hover:bg-[#fffdfa]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-[#49332d] text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-[#f3e8df] group-hover:text-[#6e493c]'}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${isActive ? 'text-[#49332d]' : 'text-slate-800'}`}>
                    {t(`adminSettings.nav.${key}`)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                    {t(`adminSettings.navDescriptions.${key}`)}
                  </span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  )
}
