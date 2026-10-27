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
  public_contact_: {
    label: 'adminSettings.site.groups.contact',
    description: 'adminSettings.site.groupDescriptions.contact',
  },
  public_pages_: {
    label: 'adminSettings.site.groups.pages',
    description: 'adminSettings.site.groupDescriptions.pages',
  },
  public_feature_: {
    label: 'adminSettings.site.groups.publicModules',
    description: 'adminSettings.site.groupDescriptions.publicModules',
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
  public_contact_bg: 'adminSettings.site.fields.contactBackground',
  public_contact_title: 'adminSettings.site.fields.contactTitle',
  public_contact_subtitle: 'adminSettings.site.fields.contactSubtitle',
  public_contact_address: 'adminSettings.site.fields.address',
  public_contact_phone: 'adminSettings.site.fields.phone',
  public_contact_email: 'adminSettings.site.fields.email',
  public_contact_map_embed: 'adminSettings.site.fields.mapEmbedUrl',
  public_contact_lat: 'adminSettings.site.fields.latitude',
  public_contact_lng: 'adminSettings.site.fields.longitude',
  public_social_facebook: 'adminSettings.site.fields.facebook',
  public_social_instagram: 'adminSettings.site.fields.instagram',
  public_social_tiktok: 'adminSettings.site.fields.tiktok',
  public_site_base_url: 'adminSettings.site.fields.siteBaseUrl',
  public_footer_text: 'adminSettings.site.fields.footerText',
  public_reserve_title: 'adminSettings.site.fields.reservationTitle',
  public_reserve_subtitle: 'adminSettings.site.fields.reservationSubtitle',
  public_reserve_bg: 'adminSettings.site.fields.reservationBackground',
  public_services_bg: 'adminSettings.site.fields.servicesBackground',
  public_services_title: 'adminSettings.site.fields.servicesTitle',
  public_services_subtitle: 'adminSettings.site.fields.servicesSubtitle',
  public_gallery_bg: 'adminSettings.site.fields.galleryBackground',
  public_gallery_title: 'adminSettings.site.fields.galleryTitle',
  public_gallery_subtitle: 'adminSettings.site.fields.gallerySubtitle',
  public_blog_bg: 'adminSettings.site.fields.blogBackground',
  public_blog_title: 'adminSettings.site.fields.blogTitle',
  public_blog_subtitle: 'adminSettings.site.fields.blogSubtitle',
  public_login_image: 'adminSettings.site.fields.signInImage',
  public_login_title: 'adminSettings.site.fields.signInTitle',
  public_login_subtitle: 'adminSettings.site.fields.signInSubtitle',
  public_register_image: 'adminSettings.site.fields.registrationImage',
  public_register_title: 'adminSettings.site.fields.registrationTitle',
  public_register_subtitle: 'adminSettings.site.fields.registrationSubtitle',
  public_feature_blog: 'adminSettings.site.fields.showBlog',
  public_feature_gallery: 'adminSettings.site.fields.showGallery',
  public_feature_reviews: 'adminSettings.site.fields.showReviews',
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
