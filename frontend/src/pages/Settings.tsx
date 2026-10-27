import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsModulePage } from '../features/settings/settings-module-page'
import { SITE_GROUPS } from '../features/settings/groups-site'

const SITE_GROUP_COPY_KEYS = {
  maintenance_: {
    label: 'adminSettings.site.groups.maintenance',
    description: 'adminSettings.site.groupDescriptions.maintenance',
  },
  public_home_: {
    label: 'adminSettings.site.groups.home',
    description: 'adminSettings.site.groupDescriptions.home',
  },
} as const

const SITE_FIELD_COPY_KEYS = {
  system_maintenance_mode: 'adminSettings.site.fields.maintenanceMode',
  public_maintenance_message: 'adminSettings.site.fields.maintenanceMessage',
  public_hero_title: 'adminSettings.site.fields.heroTitle',
  public_hero_subtitle: 'adminSettings.site.fields.heroSubtitle',
  public_hero_image: 'adminSettings.site.fields.heroImage',
  public_hero_cta_text_web: 'adminSettings.site.fields.webHeroCtaText',
  public_hero_cta_text: 'adminSettings.site.fields.mobileHeroCtaText',
  public_cta_title: 'adminSettings.site.fields.bottomCtaTitle',
  public_cta_subtitle: 'adminSettings.site.fields.bottomCtaSubtitle',
  public_about_title: 'adminSettings.site.fields.aboutTitle',
  public_about_text: 'adminSettings.site.fields.aboutText',
  public_about_image: 'adminSettings.site.fields.aboutImage',
  public_highlight_1_title: 'adminSettings.site.fields.highlight1Title',
  public_highlight_1_text: 'adminSettings.site.fields.highlight1Text',
  public_highlight_2_title: 'adminSettings.site.fields.highlight2Title',
  public_highlight_2_text: 'adminSettings.site.fields.highlight2Text',
  public_highlight_3_title: 'adminSettings.site.fields.highlight3Title',
  public_highlight_3_text: 'adminSettings.site.fields.highlight3Text',
} as const

const SITE_PLACEHOLDER_COPY_KEYS = {
  public_hero_cta_text_web: 'adminSettings.site.placeholders.webHeroCtaText',
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
          defaults: group.defaults.map((def) => {
            const placeholderKey = SITE_PLACEHOLDER_COPY_KEYS[def.key as keyof typeof SITE_PLACEHOLDER_COPY_KEYS]
            return {
              ...def,
              label: t(SITE_FIELD_COPY_KEYS[def.key as keyof typeof SITE_FIELD_COPY_KEYS]),
              ...(placeholderKey ? { placeholder: t(placeholderKey) } : {}),
            }
          }),
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
