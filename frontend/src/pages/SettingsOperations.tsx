import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsModulePage } from '../features/settings/settings-module-page'
import { OPERATIONS_GROUPS } from '../features/settings/groups-operations'
import {
  OPERATIONS_FIELD_COPY_KEYS,
  OPERATIONS_GROUP_COPY_KEYS,
} from '../features/settings/settings-copy-keys'
import { useSettingsGroups } from '../features/settings/use-settings-groups'

export default function SettingsOperations() {
  const { t } = useTranslation()
  // Sufiks „h“ dolazi iz `def.suffix` — prevedena jedinica je ista kao prije.
  const extra = useCallback(
    (def: { suffix?: string }) => (def.suffix ? { suffix: t('adminSettings.operations.units.hours') } : {}),
    [t],
  )
  const groups = useSettingsGroups({
    groups: OPERATIONS_GROUPS,
    groupCopyKeys: OPERATIONS_GROUP_COPY_KEYS,
    fieldCopyKeys: OPERATIONS_FIELD_COPY_KEYS,
    extra,
  })

  return (
    <SettingsModulePage
      title={t('adminSettings.operations.title')}
      description={t('adminSettings.operations.description')}
      groups={groups}
    />
  )
}
