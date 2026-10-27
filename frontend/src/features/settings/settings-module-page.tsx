import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { settingsList, registryMap, loading, handleSave } = useAdminSettings()
  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-gold-text" aria-label={t('common.loading')} />
      </div>
    )
  }
  return (
    <SettingsShell title={title} description={description}>
      <div className="space-y-2">
        {groups.map((group, idx) => (
          <SettingGroupPanel
            key={group.prefix}
            group={group}
            settingsList={settingsList}
            onSave={handleSave}
            registryMap={registryMap}
            showSeparator={idx > 0}
          />
        ))}
      </div>
    </SettingsShell>
  )
}
