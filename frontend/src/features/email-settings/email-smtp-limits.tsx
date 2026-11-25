import { useTranslation } from 'react-i18next'

import { Input } from '../../components/ui/input'
import type { useEmailSmtp } from './use-email-smtp'

/**
 * Grupa „Maks. konekcija / maks. poruka“ (S9).
 *
 * Izdvojeno iz `email-smtp-connection.tsx` bez promjene.
 *
 * **Obrazloženje (1.3.1/3.3.2):** jedna vidljiva labela pokrivala je DVA
 * polja, a samo prvo je imalo id — drugo nije imalo nikakvo ime, pa ga je AT
 * najavio kao „edit, prazno“. Sada je vidljivi tekst ime GRUPE
 * (`role="group"` + `aria-labelledby`), a svako polje ima svoje
 * (`aria-label`). Vizuelno identično: `<span>` nosi iste razrede koje `Label`
 * ima u osnovi (`text-sm font-medium leading-none text-content-strong`).
 */
export function EmailSmtpLimits({ smtp }: { smtp: ReturnType<typeof useEmailSmtp> }) {
  const { t } = useTranslation()

  return (
    <div role="group" aria-labelledby="email-smtp-limits-label">
      <span
        id="email-smtp-limits-label"
        className="text-sm font-medium leading-none text-content-strong"
      >
        {t('emailSettings.smtp.maxConnectionsAndMessages')}
      </span>
      <div className="mt-1 flex gap-2">
        <Input
          aria-label={t('emailSettings.smtp.maxConnections')}
          value={smtp.maxConnections}
          onChange={(event) => smtp.setMaxConnections(event.target.value)}
          placeholder="5"
        />
        <Input
          aria-label={t('emailSettings.smtp.maxMessages')}
          value={smtp.maxMessages}
          onChange={(event) => smtp.setMaxMessages(event.target.value)}
          placeholder="100"
        />
      </div>
    </div>
  )
}
