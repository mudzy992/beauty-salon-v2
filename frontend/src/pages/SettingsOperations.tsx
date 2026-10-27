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
        return {
          ...group,
          label: t(copyKeys.label),
          description: t(copyKeys.description),
          defaults: group.defaults.map((def) => ({
            ...def,
            label: t(OPERATIONS_FIELD_COPY_KEYS[def.key as keyof typeof OPERATIONS_FIELD_COPY_KEYS]),
            ...(def.suffix ? { suffix: t('adminSettings.operations.units.hours') } : {}),
          })),
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
