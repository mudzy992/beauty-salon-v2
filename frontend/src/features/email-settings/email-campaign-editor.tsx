import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'

import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import { Textarea } from '../../components/ui/textarea'
import { renderCampaignHtml } from './email-campaign-html'
import { EmailVisualEditor } from './email-visual-editor'
import type { useEmailCampaigns } from './use-email-campaigns'

/**
 * Uređivač izabrane kampanje (S9).
 *
 * Izdvojeno iz `email-campaigns-panel.tsx` bez promjene: isti `htmlFor`/`id`
 * parovi, isti `EmailVisualEditor` u builder modu, isti `Textarea` u raw HTML
 * modu i isti sanitizirani preview (`renderCampaignHtml` → `.slice(0, 1200)`).
 *
 * **Raw HTML mod je netaknut** — dozvoljeni markup kampanje i njegova
 * sanitizacija se ne mijenjaju.
 */
export function EmailCampaignEditor({
  campaigns,
}: {
  campaigns: ReturnType<typeof useEmailCampaigns>
}) {
  const { t } = useTranslation()
  const selected = campaigns.selectedCampaign
  if (!selected) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="email-campaign-selected-campaign-name">{t('emailSettings.campaigns.templateName')}</Label>
          <Input id="email-campaign-selected-campaign-name"
            className="mt-1"
            value={selected.name}
            onChange={(event) =>
              campaigns.updateSelectedCampaign((current) => ({ ...current, name: event.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="email-campaign-campaign-subject">{t('emailSettings.campaigns.subjectOverride')}</Label>
          <Input id="email-campaign-campaign-subject"
            className="mt-1"
            value={campaigns.campaignSubject}
            onChange={(event) => campaigns.setCampaignSubject(event.target.value)}
            placeholder={t('emailSettings.campaigns.subjectPlaceholder')}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="email-campaign-campaign-name">{t('emailSettings.campaigns.internalName')}</Label>
          <Input id="email-campaign-campaign-name"
            className="mt-1"
            value={campaigns.campaignName}
            onChange={(event) => campaigns.setCampaignName(event.target.value)}
            placeholder={t('emailSettings.campaigns.internalNamePlaceholder')}
          />
        </div>
      </div>

      {campaigns.campaignMode === 'builder' ? (
        <EmailVisualEditor
          blocks={selected.blocks ?? []}
          onChange={(blocks) =>
            campaigns.updateSelectedCampaign((current) => ({
              ...current,
              blocks,
              html: renderCampaignHtml(blocks),
            }))
          }
        />
      ) : (
        <div>
          <Label htmlFor="email-campaign-selected-campaign-html">{t('emailSettings.campaigns.htmlLabel')}</Label>
          <Textarea id="email-campaign-selected-campaign-html"
            className="mt-1 min-h-[320px]"
            value={selected.html}
            onChange={(event) =>
              campaigns.updateSelectedCampaign((current) => ({ ...current, html: event.target.value }))
            }
          />
        </div>
      )}

      <div>
        <p id="email-campaign-html-preview-source" className="text-sm font-medium leading-none text-content-strong">
          {t('emailSettings.campaigns.htmlPreviewSource')}
        </p>
        <pre
          aria-labelledby="email-campaign-html-preview-source"
          className="mt-1 max-h-[280px] overflow-auto rounded-md border border-line bg-surface-muted p-3 text-xs text-content ">
          {(campaigns.campaignMode === 'builder'
            ? renderCampaignHtml(selected.blocks ?? [])
            : selected.html
          ).slice(0, 1200)}
        </pre>
      </div>

      <Separator />
    </div>
  )
}

/** Broj primalaca u pregledu publike — izdvojeno radi čitljivosti. */
export function EmailCampaignAudienceTotal({ total }: { total: number }) {
  const { i18n } = useTranslation()
  return <>{formatLocalizedNumber(total, i18n.language)}</>
}
