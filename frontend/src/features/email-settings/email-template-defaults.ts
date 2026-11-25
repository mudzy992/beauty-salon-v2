import type { EmailContentBlock, EmailContentBlockType } from './email-visual-editor-types'
import type { ExistingTemplateConfig, ExistingTemplateType } from './email-settings-types'

/**
 * Podrazumijevani sadržaj postojećih email template-a (S9).
 *
 * Izdvojeno iz `pages/EmailSettings.tsx` **bez promjene**: isti tekstovi,
 * isti `{{placeholders}}` i ista normalizacija u blokove vizualnog editora.
 */
export const TEMPLATE_DEFAULTS: ExistingTemplateConfig = {
  subject: '',
  title: '',
  intro: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
  plainText: '',
}

export const getExistingTemplateDefaults = (type: ExistingTemplateType): ExistingTemplateConfig => {
  if (type === 'verification') {
    return {
      subject: 'Verifikacija email adrese',
      title: 'Verifikacija email adrese',
      intro: 'Poštovani {{firstName}},',
      body: 'Vaš verifikacijski kod je prikazan ispod. Kod važi 15 minuta.',
      ctaLabel: 'Otvori aplikaciju',
      ctaUrl: '{{appUrl}}',
      plainText: 'Vaš verifikacijski kod je validan 15 minuta.',
    }
  }
  if (type === 'reservation_new') {
    return {
      subject: 'Nova rezervacija',
      title: 'Nova rezervacija',
      intro: 'Poštovani {{firstName}},',
      body: 'Zaprimljena je nova rezervacija. Molimo pregledajte detalje i status termina.',
      ctaLabel: 'Otvori rezervacije',
      ctaUrl: '{{appUrl}}/admin/reservations',
      plainText: 'Zaprimljena je nova rezervacija.',
    }
  }
  if (type === 'reservation_confirmed') {
    return {
      subject: 'Rezervacija potvrđena',
      title: 'Vaša rezervacija je potvrđena',
      intro: 'Poštovani {{firstName}},',
      body: 'Termin je uspješno potvrđen. Hvala vam na povjerenju. Broj termina: {{reservationReference}}.',
      ctaLabel: 'Pregled rezervacije',
      ctaUrl: '{{reservationViewUrl}}',
      plainText:
        'Rezervacija je potvrđena. Broj termina: {{reservationReference}}. Link: {{reservationViewUrl}}',
    }
  }
  if (type === 'reservation_cancelled') {
    return {
      subject: 'Rezervacija otkazana',
      title: 'Obavijest o otkazivanju termina',
      intro: 'Poštovani {{firstName}},',
      body: 'Rezervacija je otkazana. Broj termina: {{reservationReference}}.',
      ctaLabel: 'Pregled rezervacije',
      ctaUrl: '{{reservationViewUrl}}',
      plainText:
        'Rezervacija je otkazana. Broj termina: {{reservationReference}}. Link: {{reservationViewUrl}}',
    }
  }
  if (type === 'reservation_reminder') {
    return {
      subject: 'Podsjetnik za termin',
      title: 'Podsjetnik za vaš termin',
      intro: 'Poštovani {{firstName}},',
      body: 'Podsjećamo vas na nadolazeći termin u našem salonu. Broj termina: {{reservationReference}}.',
      ctaLabel: 'Pregled rezervacije',
      ctaUrl: '{{reservationViewUrl}}',
      plainText:
        'Podsjetnik za vaš termin. Broj termina: {{reservationReference}}. Link: {{reservationViewUrl}}',
    }
  }
  if (type === 'reservation_reschedule') {
    return {
      subject: 'Termin je pomjeren',
      title: 'Promjena termina',
      intro: 'Poštovani {{firstName}},',
      body: 'Termin je pomjeren. Molimo provjerite novi termin i potvrdite odgovara li vam. Broj termina: {{reservationReference}}.',
      ctaLabel: 'Pregled rezervacije',
      ctaUrl: '{{reservationViewUrl}}',
      plainText:
        'Termin je pomjeren. Broj termina: {{reservationReference}}. Link: {{reservationViewUrl}}',
    }
  }
  if (type === 'holiday') {
    return {
      subject: 'Obavijest o neradnom danu',
      title: 'Neradni dan / Praznik',
      intro: 'Poštovani {{firstName}},',
      body: 'Salon će biti zatvoren zbog neradnog dana. Hvala na razumijevanju.',
      ctaLabel: 'Otvori aplikaciju',
      ctaUrl: '{{appUrl}}',
      plainText: 'Obavijest o neradnom danu.',
    }
  }
  return {
    subject: 'Nova obavijest',
    title: 'Obavijest iz salona',
    intro: 'Poštovani {{firstName}},',
    body: 'Imate novu obavijest. Otvorite aplikaciju za detalje.',
    ctaLabel: 'Otvori aplikaciju',
    ctaUrl: '{{appUrl}}',
    plainText: 'Imate novu obavijest.',
  }
}

export const normalizeExistingTemplate = (
  config: ExistingTemplateConfig,
): ExistingTemplateConfig => {
  if (Array.isArray(config.blocks)) return config
  const blocks: EmailContentBlock[] = []
  const add = (id: string, type: EmailContentBlockType, content: string, secondary?: string) => {
    if (!content.trim() && !secondary?.trim()) return
    blocks.push({ id, type, content, ...(secondary ? { secondary } : {}) })
  }
  add('legacy-title', 'title', config.title || '')
  add('legacy-intro', 'text', config.intro || '')
  add('legacy-body', 'text', config.body || '')
  add('legacy-button', 'button', config.ctaLabel || '', config.ctaUrl || '')
  return { ...config, blocks }
}
