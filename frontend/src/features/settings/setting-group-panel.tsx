import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { cn } from '../../lib/cn'
import { isMeaningfullyConfigured } from './is-configured'
import { SettingEditor } from './setting-editor'
import { GROUP_ICON_TEXT, type AppSetting, type RegistryItem, type SettingGroup } from './types'

export function SettingGroupPanel({
  group,
  settingsList,
  onSave,
  registryMap,
  showSeparator,
}: {
  group: SettingGroup
  settingsList: AppSetting[]
  onSave: (key: string, value: string, desc: string) => Promise<void>
  registryMap: Map<string, RegistryItem>
  showSeparator?: boolean
}) {
  const getByKey = (key: string) => settingsList.find((s) => s.key === key)
  const configuredCount = group.defaults.filter((d) =>
    isMeaningfullyConfigured(getByKey(d.key), registryMap.get(d.key)),
  ).length
  const GroupIcon = group.icon
  return (
    <div>
      {showSeparator ? <Separator className="my-8" /> : null}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <GroupIcon className={cn('h-5 w-5', GROUP_ICON_TEXT[group.color] ?? 'text-slate-600')} aria-hidden />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.label}</h3>
        <Badge variant={configuredCount === group.defaults.length ? 'success' : 'secondary'} className="text-[10px]">
          {configuredCount}/{group.defaults.length}
        </Badge>
      </div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{group.description}</p>
      <div className="space-y-3">
        {group.defaults.map((def) => (
          <SettingEditor key={def.key} def={def} setting={getByKey(def.key)} onSave={onSave} />
        ))}
      </div>
    </div>
  )
}
