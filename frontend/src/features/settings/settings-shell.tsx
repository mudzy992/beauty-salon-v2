import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/admin/settings', label: 'Sajt', end: true },
  { to: '/admin/settings/operations', label: 'Operacije', end: true },
  { to: '/admin/settings/appearance', label: 'Izgled', end: true },
  { to: '/admin/settings/seo', label: 'SEO', end: true },
]

export function SettingsShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="pb-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{description}</p>
      <nav className="mt-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/40">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              isActive
                ? 'rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-brand-gold shadow-sm dark:bg-slate-950'
                : 'rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-white/70 dark:text-slate-200'
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  )
}
