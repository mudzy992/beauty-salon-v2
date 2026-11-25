import type { EmailContentBlock, EmailContentBlockType } from './email-visual-editor'

/**
 * Tipovi admin email postavki (S9).
 *
 * Izdvojeno iz `pages/EmailSettings.tsx` bez promjene oblika podataka — ista
 * imena, iste opcione polja. `CampaignTemplateBlock` je alias za
 * `EmailContentBlock` i ostaje takav da vizualni editor i kampanje dijele isti
 * tip blokova.
 */
export type ProviderType = 'google' | 'office365' | 'exchange' | 'custom'

export interface AppSetting {
  key: string
  value: string | null
  isSecret?: boolean
  isConfigured?: boolean
}

export type ExistingTemplateType =
  | 'verification'
  | 'reservation_new'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'reservation_reminder'
  | 'reservation_reschedule'
  | 'holiday'
  | 'general'

export interface ExistingTemplateConfig {
  subject: string
  title: string
  intro: string
  body: string
  ctaLabel: string
  ctaUrl: string
  plainText: string
  blocks?: EmailContentBlock[]
}

export type CampaignBlockType = EmailContentBlockType
export type CampaignTemplateBlock = EmailContentBlock

export interface CampaignTemplate {
  id: string
  name: string
  html: string
  blocks: CampaignTemplateBlock[]
}

export interface CampaignAudienceSummary {
  total: number
  maxRecipients: number
  exceedsLimit: boolean
  sample: Array<{
    id: string
    username: string
    email: string | null
    firstName: string | null
    lastName: string | null
  }>
}

export interface CampaignJobSummary {
  id: string
  status: string
  totalRecipients: number
  counts: {
    pending: number
    processing: number
    delivered: number
    skipped: number
    failed: number
    cancelled: number
  }
  recipients: Array<{
    id: string
    userId: string
    username: string
    status: string
    attempts: number
    lastError: string | null
    deliveredAt: string | null
  }>
}
