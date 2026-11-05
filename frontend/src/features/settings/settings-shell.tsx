import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Globe, Palette, Search, SlidersHorizontal } from 'lucide-react'

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
    <div className="w-full space-y-6 pb-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
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
