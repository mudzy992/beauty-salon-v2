import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/cn'
import { isMeaningfullyConfigured } from './is-configured'
import { SettingEditor } from './setting-editor'
import { GROUP_ICON_TEXT, type AppSetting, type RegistryItem, type SettingGroup } from './types'

export function SettingGroupPanel({
  group,
  settingsList,
  onSave,
  registryMap,
  defaultExpanded = false,
  query = '',
}: {
  group: SettingGroup
  settingsList: AppSetting[]
  onSave: (key: string, value: string, desc: string) => Promise<void>
  registryMap: Map<string, RegistryItem>
  defaultExpanded?: boolean
  query?: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const contentId = useId()
  const getByKey = (key: string) => settingsList.find((setting) => setting.key === key)
  const customizedCount = group.defaults.filter((def) =>
    isMeaningfullyConfigured(getByKey(def.key), registryMap.get(def.key)),
  ).length
  const GroupIcon = group.icon

  useEffect(() => {
    if (query) setExpanded(true)
    else setExpanded(defaultExpanded)
  }, [defaultExpanded, query])

  return (
    <section className={cn('overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors', expanded ? 'border-slate-300' : 'border-slate-200')}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={`${t(expanded ? 'adminSettings.sections.collapse' : 'adminSettings.sections.expand')}: ${group.label}`}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9b735f] sm:px-5"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">
          <GroupIcon className={cn('h-5 w-5', GROUP_ICON_TEXT[group.color] ?? 'text-slate-600')} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-slate-900 sm:text-base">{group.label}</span>
            <Badge variant="secondary" className="text-[10px] font-medium">
              {t('adminSettings.sections.settingsCount', { count: group.defaults.length })}
            </Badge>
            {customizedCount > 0 ? (
              <Badge variant="success" className="text-[10px] font-medium">
                {t('adminSettings.sections.customizedCount', { count: customizedCount })}
              </Badge>
            ) : null}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500 sm:text-sm">{group.description}</span>
        </span>
        {expanded ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
        )}
      </button>
      <div id={contentId} hidden={!expanded} className="border-t border-slate-200 px-4 pb-2 sm:px-5">
        <div className="divide-y divide-slate-100">
          {group.defaults.map((def) => (
            <SettingEditor
              key={def.key}
              def={def}
              setting={getByKey(def.key)}
              registry={registryMap.get(def.key)}
              onSave={onSave}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
