import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsModulePage } from '../features/settings/settings-module-page'
import { APPEARANCE_GROUPS } from '../features/settings/groups-appearance'

const APPEARANCE_GROUP_COPY_KEYS = {
  app_: {
    label: 'adminSettings.appearance.group',
    description: 'adminSettings.appearance.groupDescription',
  },
} as const

const APPEARANCE_FIELD_COPY_KEYS = {
  app_title: 'adminSettings.appearance.fields.appTitle',
  app_logo: 'adminSettings.appearance.fields.logo',
  app_logo_svg_color: 'adminSettings.appearance.fields.svgLogoColor',
  app_logo_text_color: 'adminSettings.appearance.fields.logoTextColor',
  app_logo_accent: 'adminSettings.appearance.fields.logoAccentColor',
  app_logo_animated: 'adminSettings.appearance.fields.animateLogo',
  theme_primary: 'adminSettings.appearance.fields.primarySiteColor',
  theme_accent: 'adminSettings.appearance.fields.siteAccentColor',
} as const

export default function SettingsAppearance() {
  const { t } = useTranslation()
  const groups = useMemo(
    () =>
      APPEARANCE_GROUPS.map((group) => {
        const copyKeys = APPEARANCE_GROUP_COPY_KEYS[group.prefix as keyof typeof APPEARANCE_GROUP_COPY_KEYS]
        return {
          ...group,
          label: t(copyKeys.label),
          description: t(copyKeys.description),
          defaults: group.defaults.map((def) => ({
            ...def,
            label: t(APPEARANCE_FIELD_COPY_KEYS[def.key as keyof typeof APPEARANCE_FIELD_COPY_KEYS]),
          })),
        }
      }),
    [t],
  )

  return (
    <SettingsModulePage
      title={t('adminSettings.appearance.title')}
      description={t('adminSettings.appearance.description')}
      groups={groups}
    />
  )
}
