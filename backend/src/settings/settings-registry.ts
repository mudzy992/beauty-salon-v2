import type { SettingRegistryItem } from './settings-registry.types'

export const SETTINGS_REGISTRY: readonly SettingRegistryItem[] = [
  { key: 'app_title', scope: 'PUBLIC', type: 'string', defaultValue: 'Beauty Salon' },
  { key: 'app_logo', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'app_logo_icon', scope: 'PUBLIC', type: 'string', defaultValue: 'n' },
  { key: 'app_logo_accent', scope: 'PUBLIC', type: 'string', defaultValue: '#D4A843' },
  { key: 'app_logo_animated', scope: 'PUBLIC', type: 'boolean', defaultValue: 'true' },
  { key: 'system_maintenance_mode', scope: 'PUBLIC', type: 'boolean', defaultValue: 'false' },
  { key: 'public_maintenance_message', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  // Public site sections
  { key: 'public_hero_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_hero_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_hero_image', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_hero_cta_text', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_hero_cta_link', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  { key: 'public_about_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_about_text', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_about_image', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  { key: 'public_highlight_1_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_highlight_1_text', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_highlight_2_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_highlight_2_text', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_highlight_3_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_highlight_3_text', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  { key: 'public_services_peek_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_services_peek_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_service_1_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_service_1_img', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_service_2_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_service_2_img', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_service_3_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_service_3_img', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  { key: 'public_reserve_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_reserve_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_reserve_bg', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  { key: 'public_contact_bg', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_contact_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_contact_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_contact_address', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_contact_phone', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_contact_email', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_contact_map_embed', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_contact_working_hours_text', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  { key: 'public_social_facebook', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_social_instagram', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_social_tiktok', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  { key: 'public_footer_text', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_footer_copyright', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  // Auth pages visuals (public)
  { key: 'public_login_image', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_login_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_login_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_register_image', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_register_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_register_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  // Public content pages backgrounds/titles
  { key: 'public_services_bg', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_services_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_services_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_gallery_bg', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_gallery_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_gallery_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_blog_bg', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_blog_title', scope: 'PUBLIC', type: 'string', defaultValue: '' },
  { key: 'public_blog_subtitle', scope: 'PUBLIC', type: 'string', defaultValue: '' },

  // System/general (private)
  { key: 'system_public_app_url', scope: 'PRIVATE', type: 'string', defaultValue: '' },
  { key: 'system_app_version', scope: 'PRIVATE', type: 'string', defaultValue: '' },

  // Notifications (private)
  { key: 'system_notif_email_from', scope: 'PRIVATE', type: 'string', defaultValue: '' },
  { key: 'system_notif_email_name', scope: 'PRIVATE', type: 'string', defaultValue: '' },
  { key: 'system_notif_reminder_hours', scope: 'PRIVATE', type: 'number', defaultValue: '24', min: 1, max: 168 },

  // Email (private, includes secrets)
  { key: 'system_email_provider', scope: 'PRIVATE', type: 'string', defaultValue: 'google' },
  { key: 'system_email_host', scope: 'PRIVATE', type: 'string', defaultValue: '' },
  { key: 'system_email_port', scope: 'PRIVATE', type: 'number', defaultValue: '587', min: 1, max: 65535 },
  { key: 'system_email_secure', scope: 'PRIVATE', type: 'boolean', defaultValue: 'false' },
  { key: 'system_email_username', scope: 'PRIVATE', type: 'string', defaultValue: '' },
  { key: 'system_email_password', scope: 'PRIVATE', type: 'string', defaultValue: '', isSecret: true },
  { key: 'system_email_tls_reject_unauthorized', scope: 'PRIVATE', type: 'boolean', defaultValue: 'true' },
  { key: 'system_email_require_tls', scope: 'PRIVATE', type: 'boolean', defaultValue: 'false' },
  { key: 'system_email_ignore_tls', scope: 'PRIVATE', type: 'boolean', defaultValue: 'false' },
  { key: 'system_email_connection_timeout_ms', scope: 'PRIVATE', type: 'number', defaultValue: '10000', min: 1000, max: 120000 },
  { key: 'system_email_greeting_timeout_ms', scope: 'PRIVATE', type: 'number', defaultValue: '10000', min: 1000, max: 120000 },
  { key: 'system_email_socket_timeout_ms', scope: 'PRIVATE', type: 'number', defaultValue: '20000', min: 1000, max: 300000 },
  { key: 'system_email_pool', scope: 'PRIVATE', type: 'boolean', defaultValue: 'true' },
  { key: 'system_email_max_connections', scope: 'PRIVATE', type: 'number', defaultValue: '5', min: 1, max: 50 },
  { key: 'system_email_max_messages', scope: 'PRIVATE', type: 'number', defaultValue: '100', min: 1, max: 5000 },
  { key: 'system_email_reply_to', scope: 'PRIVATE', type: 'string', defaultValue: '' },
  { key: 'system_email_signature', scope: 'PRIVATE', type: 'string', defaultValue: '' },

  // Email templates/campaigns (private)
  { key: 'system_email_campaign_templates', scope: 'PRIVATE', type: 'json', defaultValue: '[]' },
  { key: 'system_email_template_verification', scope: 'PRIVATE', type: 'json', defaultValue: '{}' },
  { key: 'system_email_template_reservation_new', scope: 'PRIVATE', type: 'json', defaultValue: '{}' },
  { key: 'system_email_template_reservation_confirmed', scope: 'PRIVATE', type: 'json', defaultValue: '{}' },
  { key: 'system_email_template_reservation_cancelled', scope: 'PRIVATE', type: 'json', defaultValue: '{}' },
  { key: 'system_email_template_reservation_reminder', scope: 'PRIVATE', type: 'json', defaultValue: '{}' },
  { key: 'system_email_template_reservation_reschedule', scope: 'PRIVATE', type: 'json', defaultValue: '{}' },
  { key: 'system_email_template_holiday', scope: 'PRIVATE', type: 'json', defaultValue: '{}' },
  { key: 'system_email_template_general', scope: 'PRIVATE', type: 'json', defaultValue: '{}' },

  // Loyalty (private)
  { key: 'loyalty_enabled', scope: 'PRIVATE', type: 'boolean', defaultValue: 'false' },
  { key: 'loyalty_points_per_currency', scope: 'PRIVATE', type: 'number', defaultValue: '1', min: 0, max: 100 },
  { key: 'loyalty_earn_on_tip', scope: 'PRIVATE', type: 'boolean', defaultValue: 'false' },
  { key: 'loyalty_min_amount_for_earn', scope: 'PRIVATE', type: 'number', defaultValue: '0', min: 0, max: 100000 },
  { key: 'loyalty_excluded_services', scope: 'PRIVATE', type: 'json', defaultValue: '[]' },
  { key: 'loyalty_redeem_enabled', scope: 'PRIVATE', type: 'boolean', defaultValue: 'false' },
  { key: 'loyalty_redeem_rate', scope: 'PRIVATE', type: 'number', defaultValue: '0.1', min: 0, max: 10 },
  { key: 'loyalty_min_points_to_redeem', scope: 'PRIVATE', type: 'number', defaultValue: '0', min: 0, max: 1000000 },
  { key: 'loyalty_max_discount_percent', scope: 'PRIVATE', type: 'number', defaultValue: '100', min: 0, max: 100 },
  { key: 'loyalty_tiers', scope: 'PRIVATE', type: 'json', defaultValue: '[]' },

  // Deprecated (kept for migration visibility; not consumed by backend today)
  { key: 'system_reservation_lock_minutes', scope: 'PRIVATE', type: 'number', defaultValue: '15', min: 1, max: 120 },
  { key: 'system_reservation_attendance_hours', scope: 'PRIVATE', type: 'number', defaultValue: '24', min: 1, max: 72 },
  { key: 'system_reservation_auto_cancel', scope: 'PRIVATE', type: 'boolean', defaultValue: 'false' },
] as const

