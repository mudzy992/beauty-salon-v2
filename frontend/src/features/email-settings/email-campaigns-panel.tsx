import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Select } from '../../components/ui/select'
import { EmailCampaignAudience } from './email-campaign-audience'
import { EmailCampaignEditor } from './email-campaign-editor'
import { EmailCampaignProgress } from './email-campaign-progress'
import type { useEmailCampaigns } from './use-email-campaigns'

/**
 * Kampanja tab admin email postavki (S9).
 *
 * Ornkestrator: bira template i mod, te spaja editor, publiku i napredak.
 * Markup, programske labele i redoslijed su isti kao prije razbijanja.
 */
export function EmailCampaignsPanel({
  campaigns,
}: {
  campaigns: ReturnType<typeof useEmailCampaigns>
}) {
  const { t } = useTranslation()
  const selectClass =
    'flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-content'

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="outline" onClick={campaigns.handleCreateCampaign}>
              <Plus className="mr-2 h-4 w-4" />
              {t('emailSettings.campaigns.newTemplate')}
            </Button>
            {/* 3.3.2/4.1.2: oba select-a su bila bez i jedne labele — AT ih je
                imenovao tek po izabranoj opciji. Vidljive labele ovdje nema (red je
                dugme + dva select-a), pa idu programske. */}
            <Select
              aria-label={t('emailSettings.campaigns.templatePicker')}
              className={`${selectClass} sm:w-[320px]`}
              value={campaigns.selectedCampaignId}
              onChange={(event) => campaigns.setSelectedCampaignId(event.target.value)}
            >
              {campaigns.campaignTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t('emailSettings.campaigns.modePicker')}
              className={`${selectClass} sm:w-[220px]`}
              value={campaigns.campaignMode}
              onChange={(event) => campaigns.setCampaignMode(event.target.value as 'builder' | 'html')}
            >
              <option value="builder">{t('emailSettings.campaigns.builderMode')}</option>
              <option value="html">{t('emailSettings.campaigns.htmlMode')}</option>
            </Select>
          </div>
        </div>

        {campaigns.selectedCampaign ? (
          <div className="space-y-4">
            <EmailCampaignEditor campaigns={campaigns} />
            <EmailCampaignAudience campaigns={campaigns} />

            {campaigns.campaignJob ? (
              <EmailCampaignProgress
                job={campaigns.campaignJob}
                loadFailed={campaigns.campaignJobLoadFailed}
                actionBusy={campaigns.campaignJobActionBusy}
                onCancel={() => void campaigns.handleCancelCampaign()}
                onRetry={() => void campaigns.handleRetryFailedCampaign()}
              />
            ) : null}

            <p className="text-xs text-content-strong">
              {t('emailSettings.campaigns.dynamicVariables')}{' '}
              {'{{firstName}}'} {'{{lastName}}'} {'{{username}}'} {'{{email}}'} {'{{appUrl}}'}
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={() => void campaigns.handleSaveCampaignTemplates()}
              disabled={campaigns.savingCampaigns}
            >
              {campaigns.savingCampaigns ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
              {t('emailSettings.campaigns.saveTemplates')}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-content-strong">
            {t('emailSettings.campaigns.noTemplates', {
              action: t('emailSettings.campaigns.newTemplate'),
            })}
          </p>
        )}
      </div>
    </Card>
  )
}
