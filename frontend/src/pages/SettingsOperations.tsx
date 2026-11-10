import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsModulePage } from '../features/settings/settings-module-page'
import { OPERATIONS_GROUPS } from '../features/settings/groups-operations'

const OPERATIONS_GROUP_COPY_KEYS = {
  'salon.': {
    label: 'adminSettings.operations.groups.timezone',
    description: 'adminSettings.operations.groupDescriptions.timezone',
  },
  system_reservation_: {
    label: 'adminSettings.operations.groups.reservations',
    description: 'adminSettings.operations.groupDescriptions.reservations',
  },
  system_notif_: {
    label: 'adminSettings.operations.groups.notifications',
    description: 'adminSettings.operations.groupDescriptions.notifications',
  },
} as const

const OPERATIONS_FIELD_COPY_KEYS = {
  'salon.timezone': 'adminSettings.operations.fields.timezone',
  system_reservation_attendance_hours: 'adminSettings.operations.fields.attendanceDeadline',
  system_reservation_inbox_timeout_hours: 'adminSettings.operations.fields.inboxTimeout',
  system_reservation_daily_log_reminder_hours: 'adminSettings.operations.fields.dailyLogReminder',
  system_notif_reminder_hours: 'adminSettings.operations.fields.customerReminder',
  system_push_enabled: 'adminSettings.operations.fields.pushEnabled',
} as const

export default function SettingsOperations() {
  const { t } = useTranslation()
  const groups = useMemo(
    () =>
      OPERATIONS_GROUPS.map((group) => {
        const copyKeys = OPERATIONS_GROUP_COPY_KEYS[group.prefix as keyof typeof OPERATIONS_GROUP_COPY_KEYS]
        // Mapa je CI-pokrivena (`test:i18n-key-resolution`, test 5); ovi štitovi samo
        // sprječavaju bijeli ekran (`t(copyKeys.label)` na undefined baca TypeError) i
        // praznu labelu (`t(undefined)` vraća '') ako se mapa ikad razdvoji od izvora.
        if (!copyKeys) return group
        return {
          ...group,
          label: t(copyKeys.label),
          description: t(copyKeys.description),
          defaults: group.defaults.map((def) => {
            const fieldKey = OPERATIONS_FIELD_COPY_KEYS[def.key as keyof typeof OPERATIONS_FIELD_COPY_KEYS]
            return {
              ...def,
              ...(fieldKey ? { label: t(fieldKey) } : {}),
              ...(def.suffix ? { suffix: t('adminSettings.operations.units.hours') } : {}),
            }
          }),
        }
      }),
    [t],
  )

  return (
    <SettingsModulePage
      title={t('adminSettings.operations.title')}
      description={t('adminSettings.operations.description')}
      groups={groups}
    />
  )
}
