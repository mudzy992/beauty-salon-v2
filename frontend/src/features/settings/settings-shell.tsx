import type { ReactNode } from 'react'
import { SettingsTabNav } from './settings-tab-nav'

/**
 * Omotač stranice postavki: naslov + pod-navigacija (M2) + sadržaj.
 *
 * Pod-navigacija je izdvojena u `SettingsTabNav` jer je nakon M2 treba i hub
 * za tabove koji nemaju `SettingsModulePage` (e-mail, notifikacije, release),
 * pa bi inače svaki tab imao svoju kopiju ili nijednu.
 */
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
    <div className="w-full space-y-6 pb-10">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      </header>

      <SettingsTabNav />

      <div>{children}</div>
    </div>
  )
}
