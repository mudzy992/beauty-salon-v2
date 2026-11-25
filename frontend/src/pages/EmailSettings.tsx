import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import api from '../api/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { EmailCampaignsPanel } from '../features/email-settings/email-campaigns-panel'
import { EmailSmtpPanel } from '../features/email-settings/email-smtp-panel'
import { EmailTemplatesPanel } from '../features/email-settings/email-templates-panel'
import { useEmailCampaigns } from '../features/email-settings/use-email-campaigns'
import { useEmailSmtp } from '../features/email-settings/use-email-smtp'
import { useEmailTemplates } from '../features/email-settings/use-email-templates'
import { AdminConfirmDialog, type AdminConfirmRequest } from '../features/shell/admin/ui/admin-confirm-dialog'
import type { AppSetting } from '../features/email-settings/email-settings-types'

/**
 * Admin email postavke (S9).
 *
 * Stranica je sada **orkestrator**: tri taba (`smtp`, `templates`, `campaigns`)
 * su izdvojeni u `features/email-settings/*`, a stanje u tri hooka.
 *
 * Učitavanje je i dalje **jedan** `GET /api/settings` koji se pročita i
 * raspodijeli na tri hooka (`applySettings`), pa se mrežni zahtjevi nisu
 * umnožili. Sanitizirani preview, raw HTML kampanja i svi ključevi postavki
 * su isti kao prije.
 */
export default function EmailSettings() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)

  const smtp = useEmailSmtp({ setConfirmRequest })
  const templates = useEmailTemplates()
  const campaigns = useEmailCampaigns({ setConfirmRequest })

  // Hookovi stvaraju `applySettings` pri svakom renderu, pa se u efektu čitaju
  // iz `ref`-a. Time se izbjegava ponovno učitavanje pri svakoj promjeni stanja,
  // a ponašanje je isto kao prije (JEDAN `GET /api/settings` na mount).
  const latest = useRef({ smtp, templates, campaigns })
  latest.current = { smtp, templates, campaigns }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await api.get<AppSetting[]>('/api/settings')
        const list = Array.isArray(data) ? data : []
        if (!active) return
        latest.current.smtp.applySettings(list)
        latest.current.templates.applySettings(list)
        latest.current.campaigns.applySettings(list)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-content-strong">
        <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-content">{t('emailSettings.title')}</h1>
      <p className="mb-6 text-content-strong ">
        {t('emailSettings.description')}
      </p>

      <Tabs defaultValue="smtp">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
          <TabsTrigger value="smtp">{t('emailSettings.tabs.smtp')}</TabsTrigger>
          <TabsTrigger value="templates">{t('emailSettings.tabs.templates')}</TabsTrigger>
          <TabsTrigger value="campaigns">{t('emailSettings.tabs.campaigns')}</TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="mt-4">
          <EmailSmtpPanel smtp={smtp} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <EmailTemplatesPanel templates={templates} />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <EmailCampaignsPanel campaigns={campaigns} />
        </TabsContent>
      </Tabs>
      <AdminConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  )
}
