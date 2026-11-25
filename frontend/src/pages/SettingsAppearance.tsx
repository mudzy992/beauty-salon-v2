import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsModulePage } from '../features/settings/settings-module-page'
import { APPEARANCE_GROUPS } from '../features/settings/groups-appearance'
import {
  APPEARANCE_FIELD_COPY_KEYS,
  APPEARANCE_GROUP_COPY_KEYS,
} from '../features/settings/settings-copy-keys'
import { useSettingsGroups } from '../features/settings/use-settings-groups'
import { useTheme } from '../features/shell/theme/theme-context'

export default function SettingsAppearance() {
  const { t } = useTranslation()
  // Q9 / NEJRA §12 — dok je Aurum aktivan, runtime override nije aktivan; korisnik
  // to mora vidjeti upravo na Postavke → Izgled, bez promjene ikakvog API-ja.
  const { skin } = useTheme()
  const extra = useCallback(
    (def: { key: string }) => {
      if (def.key === 'theme_active_skin') {
        return {
          options: [
            { value: 'classic', label: t('shell.theme.classic') },
            { value: 'aurum', label: t('adminSettings.appearance.newIdentity') },
          ],
        }
      }
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
      {skin !== 'classic' ? (
        <p
          data-aurum-note
          role="note"
          className="mb-4 rounded-lg border border-control-border bg-surface-muted p-3 text-sm text-content"
        >
          {t('adminSettings.appearance.aurumNote')}
        </p>
      ) : null}
      <SettingsModulePage
        title={t('adminSettings.appearance.title')}
        description={t('adminSettings.appearance.description')}
        groups={groups}
      />
    </>
  )
}
