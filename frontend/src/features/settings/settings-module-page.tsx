import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, Settings2, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { SettingsShell } from './settings-shell'
import { SettingGroupPanel } from './setting-group-panel'
import { useAdminSettings } from './use-admin-settings'
import type { SettingGroup } from './types'

export function SettingsModulePage({
  title,
  description,
  groups,
}: {
  title: string
  description: string
  groups: SettingGroup[]
}) {
  const { t, i18n } = useTranslation()
  const inputId = useId()
  const [query, setQuery] = useState('')
  const { settingsList, registryMap, loading, loadError, handleSave, loadData } = useAdminSettings()
  const normalizedQuery = query.trim().toLocaleLowerCase(i18n.resolvedLanguage || i18n.language)
  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return groups
    return groups
      .map((group) => {
        const language = i18n.resolvedLanguage || i18n.language
        const groupMatches = [group.label, group.description]
          .some((value) => value.toLocaleLowerCase(language).includes(normalizedQuery))
        return {
          ...group,
          defaults: groupMatches
            ? group.defaults
            : group.defaults.filter((def) =>
                [def.label, def.desc, def.key, def.helpText]
                  .filter(Boolean)
                  .some((value) => value!.toLocaleLowerCase(language).includes(normalizedQuery)),
              ),
        }
      })
      .filter((group) => group.defaults.length > 0)
  }, [groups, i18n.language, i18n.resolvedLanguage, normalizedQuery])
  const totalSettings = groups.reduce((total, group) => total + group.defaults.length, 0)
  const visibleSettings = visibleGroups.reduce((total, group) => total + group.defaults.length, 0)

  return (
    <SettingsShell title={title} description={description}>
      <section aria-label={t('adminSettings.search.label')} className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xl">
            <label htmlFor={inputId} className="sr-only">{t('adminSettings.search.label')}</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              id={inputId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('adminSettings.search.placeholder')}
              className="h-11 rounded-xl pl-10 pr-10"
              aria-controls="settings-groups-list"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('adminSettings.search.clear')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b735f]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Settings2 className="h-4 w-4 text-[#8a624e]" aria-hidden="true" />
            {normalizedQuery
              ? t('adminSettings.search.results', { count: visibleSettings })
              : t('adminSettings.sections.settingsCount', { count: totalSettings })}
          </p>
        </div>
      </section>

      {loading ? (
        <div role="status" aria-live="polite" className="space-y-3 py-4">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#8a624e]" aria-hidden="true" />
            <span className="sr-only">{t('common.loading')}</span>
          </div>
          {[0, 1, 2].map((item) => (
            <div key={item} aria-hidden="true" className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-col items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('adminSettings.editor.loadFailed')}</p>
          <Button type="button" variant="outline" onClick={() => void loadData()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : visibleGroups.length === 0 ? (
        <div id="settings-groups-list" role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3e8df] text-[#80553e]">
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('adminSettings.search.noResultsTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{t('adminSettings.search.noResultsDescription')}</p>
          <Button type="button" variant="outline" className="mt-5" onClick={() => setQuery('')}>
            {t('adminSettings.search.clear')}
          </Button>
        </div>
      ) : (
        <div id="settings-groups-list" className="space-y-3">
          {visibleGroups.map((group, index) => (
            <SettingGroupPanel
              key={group.prefix}
              group={group}
              settingsList={settingsList}
              onSave={handleSave}
              registryMap={registryMap}
              defaultExpanded={index === 0 || Boolean(normalizedQuery)}
              query={normalizedQuery}
            />
          ))}
        </div>
      )}
    </SettingsShell>
  )
}
