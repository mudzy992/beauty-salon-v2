import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
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
  const { settingsList, registryMap, loading, loadError, handleSave, loadData } = useAdminSettings()
  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-gold-text" aria-hidden="true" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    )
  }
  return (
    <SettingsShell title={title} description={description}>
      {loadError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
          <p>{t('adminSettings.editor.loadFailed')}</p>
          <Button type="button" variant="outline" onClick={() => void loadData()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
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
      )}
    </SettingsShell>
  )
}
