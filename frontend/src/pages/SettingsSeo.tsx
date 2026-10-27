import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsModulePage } from '../features/settings/settings-module-page'
import { SEO_GROUPS } from '../features/settings/groups-seo'

const SEO_GROUP_COPY_KEYS = {
  'seo_default_': {
    label: 'adminSettings.seo.defaultGroup',
    description: 'adminSettings.seo.defaultGroupDescription',
  },
  'seo_page_': {
    label: 'adminSettings.seo.pageGroup',
    description: 'adminSettings.seo.pageGroupDescription',
  },
} as const

const SEO_FIELD_COPY_KEYS = {
  seo_default_title: 'adminSettings.seo.fields.defaultTitle',
  seo_default_description: 'adminSettings.seo.fields.defaultDescription',
  seo_og_image: 'adminSettings.seo.fields.openGraphImage',
  seo_page_home_title: 'adminSettings.seo.fields.homeTitle',
  seo_page_home_description: 'adminSettings.seo.fields.homeDescription',
  seo_page_services_title: 'adminSettings.seo.fields.servicesTitle',
  seo_page_services_description: 'adminSettings.seo.fields.servicesDescription',
  seo_page_blog_title: 'adminSettings.seo.fields.blogTitle',
  seo_page_blog_description: 'adminSettings.seo.fields.blogDescription',
  seo_page_gallery_title: 'adminSettings.seo.fields.galleryTitle',
  seo_page_gallery_description: 'adminSettings.seo.fields.galleryDescription',
  seo_page_contact_title: 'adminSettings.seo.fields.contactTitle',
  seo_page_contact_description: 'adminSettings.seo.fields.contactDescription',
  seo_page_reserve_title: 'adminSettings.seo.fields.reservationTitle',
  seo_page_reserve_description: 'adminSettings.seo.fields.reservationDescription',
} as const

export default function SettingsSeo() {
  const { t } = useTranslation()
  const groups = useMemo(
    () =>
      SEO_GROUPS.map((group) => {
        const copyKeys = SEO_GROUP_COPY_KEYS[group.prefix as keyof typeof SEO_GROUP_COPY_KEYS]
        return {
          ...group,
          label: t(copyKeys.label),
          description: t(copyKeys.description),
          defaults: group.defaults.map((def) => ({
            ...def,
            label: t(SEO_FIELD_COPY_KEYS[def.key as keyof typeof SEO_FIELD_COPY_KEYS]),
          })),
        }
      }),
    [t],
  )

  return <SettingsModulePage title={t('adminSettings.seo.title')} description={t('adminSettings.seo.description')} groups={groups} />
}
