import { useTranslation } from 'react-i18next'

import { SettingsModulePage } from '../features/settings/settings-module-page'
import { SEO_GROUPS } from '../features/settings/groups-seo'
import {
  SEO_FIELD_COPY_KEYS,
  SEO_GROUP_COPY_KEYS,
} from '../features/settings/settings-copy-keys'
import { useSettingsGroups } from '../features/settings/use-settings-groups'

export default function SettingsSeo() {
  const { t } = useTranslation()
  const groups = useSettingsGroups({
    groups: SEO_GROUPS,
    groupCopyKeys: SEO_GROUP_COPY_KEYS,
    fieldCopyKeys: SEO_FIELD_COPY_KEYS,
  })

  return <SettingsModulePage title={t('adminSettings.seo.title')} description={t('adminSettings.seo.description')} groups={groups} />
}
