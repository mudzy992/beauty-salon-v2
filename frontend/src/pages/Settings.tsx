import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsModulePage } from '../features/settings/settings-module-page'
import { SITE_GROUPS } from '../features/settings/groups-site'

const SITE_GROUP_COPY_KEYS = {
  maintenance_: {
    label: 'adminSettings.site.groups.maintenance',
    description: 'adminSettings.site.groupDescriptions.maintenance',
  },
} as const

const SITE_FIELD_COPY_KEYS = {
  system_maintenance_mode: 'adminSettings.site.fields.maintenanceMode',
  public_maintenance_message: 'adminSettings.site.fields.maintenanceMessage',
} as const

export default function Settings() {
  const { t } = useTranslation()
  const groups = useMemo(
    () =>
      SITE_GROUPS.map((group) => {
        const copyKeys = SITE_GROUP_COPY_KEYS[group.prefix as keyof typeof SITE_GROUP_COPY_KEYS]
        if (!copyKeys) return group
        return {
          ...group,
          label: t(copyKeys.label),
          description: t(copyKeys.description),
          defaults: group.defaults.map((def) => ({
            ...def,
            label: t(SITE_FIELD_COPY_KEYS[def.key as keyof typeof SITE_FIELD_COPY_KEYS]),
          })),
        }
      }),
    [t],
  )

  return (
    <SettingsModulePage
      title={t('adminSettings.site.title')}
      description={t('adminSettings.site.description')}
      groups={groups}
    />
  )
}
