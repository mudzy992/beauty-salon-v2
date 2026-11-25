/**
 * Kopije (label/description) za grupe postavki — OPERATIONS / APPEARANCE / SEO (S9).
 *
 * Izdvojeno iz `pages/Settings*.tsx` bez promjene: iste mape ključeva, isti
 * odnos grupe → polje. Mapa je CI-pokrivena (`test:i18n-key-resolution`, test 5);
 * štitovi u `useSettingsGroups` samo sprječavaju bijeli ekran i praznu labelu.
 */

export const OPERATIONS_GROUP_COPY_KEYS = {
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

export const OPERATIONS_FIELD_COPY_KEYS = {
  'salon.timezone': 'adminSettings.operations.fields.timezone',
  system_reservation_attendance_hours: 'adminSettings.operations.fields.attendanceDeadline',
  system_reservation_inbox_timeout_hours: 'adminSettings.operations.fields.inboxTimeout',
  system_reservation_daily_log_reminder_hours: 'adminSettings.operations.fields.dailyLogReminder',
  system_notif_reminder_hours: 'adminSettings.operations.fields.customerReminder',
  system_push_enabled: 'adminSettings.operations.fields.pushEnabled',
} as const

export const APPEARANCE_GROUP_COPY_KEYS = {
  app_: {
    label: 'adminSettings.appearance.group',
    description: 'adminSettings.appearance.groupDescription',
  },
} as const

export const APPEARANCE_FIELD_COPY_KEYS = {
  app_title: 'adminSettings.appearance.fields.appTitle',
  app_logo: 'adminSettings.appearance.fields.logo',
  app_logo_svg_color: 'adminSettings.appearance.fields.svgLogoColor',
  app_logo_text_color: 'adminSettings.appearance.fields.logoTextColor',
  app_logo_accent: 'adminSettings.appearance.fields.logoAccentColor',
  app_logo_animated: 'adminSettings.appearance.fields.animateLogo',
  theme_active_skin: 'adminSettings.appearance.fields.activeSkin',
  theme_default_mode: 'adminSettings.appearance.fields.defaultMode',
  theme_primary: 'adminSettings.appearance.fields.primarySiteColor',
  theme_accent: 'adminSettings.appearance.fields.siteAccentColor',
} as const

export const SEO_GROUP_COPY_KEYS = {
  'seo_default_': {
    label: 'adminSettings.seo.defaultGroup',
    description: 'adminSettings.seo.defaultGroupDescription',
  },
  'seo_page_': {
    label: 'adminSettings.seo.pageGroup',
    description: 'adminSettings.seo.pageGroupDescription',
  },
} as const

export const SEO_FIELD_COPY_KEYS = {
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
