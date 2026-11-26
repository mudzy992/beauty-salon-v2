import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsModulePage } from '../features/settings/settings-module-page'
import { APPEARANCE_GROUPS } from '../features/settings/groups-appearance'
import {
  APPEARANCE_FIELD_COPY_KEYS,
  APPEARANCE_GROUP_COPY_KEYS,
} from '../features/settings/settings-copy-keys'
import { useSettingsGroups } from '../features/settings/use-settings-groups'

export default function SettingsAppearance() {
  const { t } = useTranslation()
  const extra = useCallback(
    (def: { key: string }) => {
      if (def.key === 'theme_default_mode') {
        return {
          options: [
            { value: 'light', label: t('shell.theme.aurumLight') },
            { value: 'dark', label: t('shell.theme.aurumDark') },
          ],
        }
      }
      return {}
    },
    [t],
  )
  const groups = useSettingsGroups({
    groups: APPEARANCE_GROUPS,
    groupCopyKeys: APPEARANCE_GROUP_COPY_KEYS,
    fieldCopyKeys: APPEARANCE_FIELD_COPY_KEYS,
    extra,
  })

  return (
    <>
      <p
        data-aurum-note
        role="note"
        className="mb-4 rounded-lg border border-control-border bg-surface-muted p-3 text-sm text-content"
      >
        {t('adminSettings.appearance.aurumNote')}
      </p>
      <SettingsModulePage
        title={t('adminSettings.appearance.title')}
        description={t('adminSettings.appearance.description')}
        groups={groups}
      />
    </>
  )
}
