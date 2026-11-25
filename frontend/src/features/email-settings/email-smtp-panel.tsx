import { Card } from '../../components/ui/card'
import { EmailSmtpConnection } from './email-smtp-connection'
import { EmailSmtpSender } from './email-smtp-sender'
import type { useEmailSmtp } from './use-email-smtp'

/**
 * SMTP tab admin email postavki (S9).
 *
 * Ornkestrator: spaja konfiguraciju servera i pošiljalaca/test poruku.
 * Markup, `htmlFor`/`id` parovi i poruke su isti kao prije razbijanja —
 * 28 labela u cijelom modulu.
 */
export function EmailSmtpPanel({ smtp }: { smtp: ReturnType<typeof useEmailSmtp> }) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <EmailSmtpConnection smtp={smtp} />
        <EmailSmtpSender smtp={smtp} />
      </div>
    </Card>
  )
}
