import { useTranslation } from 'react-i18next'

import { SettingsModulePage } from '../features/settings/settings-module-page'
import { SITE_GROUPS } from '../features/settings/groups-site'
import {
  SITE_FIELD_COPY_KEYS,
  SITE_GROUP_COPY_KEYS,
  SITE_PLACEHOLDER_COPY_KEYS,
} from '../features/settings/settings-copy-keys-site'
import { useSettingsGroups } from '../features/settings/use-settings-groups'

export default function Settings() {
  const { t } = useTranslation()
  const groups = useSettingsGroups({
    groups: SITE_GROUPS,
    groupCopyKeys: SITE_GROUP_COPY_KEYS,
    fieldCopyKeys: SITE_FIELD_COPY_KEYS,
    placeholderCopyKeys: SITE_PLACEHOLDER_COPY_KEYS,
  })

  return (
    <SettingsModulePage
      title={t('adminSettings.site.title')}
      description={t('adminSettings.site.description')}
      groups={groups}
    />
  )
}
