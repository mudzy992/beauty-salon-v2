import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import type { useEmailSmtp } from './use-email-smtp'

/**
 * Pošiljalac i test email (S9).
 *
 * Izdvojeno iz `email-smtp-panel.tsx` bez promjene: isti `htmlFor`/`id` parovi,
 * iste akcije (sačuvaj / testiraj konekciju / pošalji test / pošalji sebi) i
 * isti redoslijed.
 */
export function EmailSmtpSender({ smtp }: { smtp: ReturnType<typeof useEmailSmtp> }) {
  const { t } = useTranslation()

  return (
    <>
      <Separator />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="email-smtp-from-email">{t('emailSettings.smtp.fromEmail')}</Label>
          <Input id="email-smtp-from-email" className="mt-1" value={smtp.fromEmail} onChange={(event) => smtp.setFromEmail(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="email-smtp-from-name">{t('emailSettings.smtp.fromName')}</Label>
          <Input id="email-smtp-from-name" className="mt-1" value={smtp.fromName} onChange={(event) => smtp.setFromName(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="email-smtp-reply-to">{t('emailSettings.smtp.replyTo')}</Label>
          <Input id="email-smtp-reply-to"
            className="mt-1"
            value={smtp.replyTo}
            onChange={(event) => smtp.setReplyTo(event.target.value)}
            placeholder="support@domena.com"
          />
        </div>
        <div>
          <Label htmlFor="email-smtp-signature">{t('emailSettings.smtp.signature')}</Label>
          <Input id="email-smtp-signature" className="mt-1" value={smtp.signature} onChange={(event) => smtp.setSignature(event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="email-smtp-public-app-url">{t('emailSettings.smtp.publicAppUrl')}</Label>
          <Input id="email-smtp-public-app-url"
            className="mt-1"
            value={smtp.publicAppUrl}
            onChange={(event) => smtp.setPublicAppUrl(event.target.value)}
            placeholder="https://vas-domen.ba"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void smtp.handleSave()} disabled={smtp.saving}>
          {smtp.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
          {t('emailSettings.smtp.saveSettings')}
        </Button>
        <Button type="button" variant="outline" onClick={() => void smtp.handleTestConnection()} disabled={smtp.testingConnection}>
          {smtp.testingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
          {t('emailSettings.smtp.testConnection')}
        </Button>
      </div>

      <Separator />

      <div>
        <Label htmlFor="email-smtp-test-email-to">{t('emailSettings.smtp.testEmail')}</Label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input id="email-smtp-test-email-to"
            value={smtp.testEmailTo}
            onChange={(event) => smtp.setTestEmailTo(event.target.value)}
            placeholder="email@domena.com"
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void smtp.handleSendTestEmail()} disabled={smtp.sendingTest}>
              {smtp.sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
              {t('emailSettings.smtp.sendTest')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void smtp.handleSendTestToMe()} disabled={smtp.sendingTest}>
              {smtp.sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
              {t('emailSettings.smtp.sendToAdmin')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
