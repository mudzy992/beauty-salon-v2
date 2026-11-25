import type { ExistingTemplateType, ProviderType } from './email-settings-types'

/**
 * konstante admin email postavki (S9).
 *
 * Izdvojeno iz `pages/EmailSettings.tsx` **bez promjene**: isti ključevi
 * postavki (`system_email_*`), isti presetovi hostova i isti niz tipova
 * template-a.
 *
 * Podrazumijevani tekstovi template-a su u `email-template-defaults.ts`, a
 * generator HTML-a kampanje (sa bijelom listom) u `email-campaign-html.ts` —
 * oba su izdvojena **bez ijedne promjene sadržaja**.
 */
export const PROVIDERS: Array<{ id: ProviderType }> = [
  { id: 'google' },
  { id: 'office365' },
  { id: 'exchange' },
  { id: 'custom' },
]

export const PRESETS: Record<ProviderType, { host: string; port: string; secure: boolean }> = {
  google: { host: 'smtp.gmail.com', port: '587', secure: false },
  office365: { host: 'smtp.office365.com', port: '587', secure: false },
  exchange: { host: '', port: '587', secure: false },
  custom: { host: '', port: '587', secure: false },
}

export const KEYS = {
  host: 'system_email_host',
  port: 'system_email_port',
  secure: 'system_email_secure',
  username: 'system_email_username',
  password: 'system_email_password',
  rejectUnauthorized: 'system_email_tls_reject_unauthorized',
  fromEmail: 'system_notif_email_from',
  fromName: 'system_notif_email_name',
} as const

export const EXISTING_TEMPLATE_TYPES: Array<{ id: ExistingTemplateType; label: string }> = [
  { id: 'verification', label: 'Verifikacija emaila' },
  { id: 'reservation_new', label: 'Nova rezervacija' },
  { id: 'reservation_confirmed', label: 'Potvrđena rezervacija' },
  { id: 'reservation_cancelled', label: 'Otkazana rezervacija' },
  { id: 'reservation_reminder', label: 'Podsjetnik rezervacije' },
  { id: 'reservation_reschedule', label: 'Pomjerena rezervacija' },
  { id: 'holiday', label: 'Praznik / neradni dan' },
  { id: 'general', label: 'Generalna notifikacija' },
]

export const CAMPAIGN_KEY = 'system_email_campaign_templates'
