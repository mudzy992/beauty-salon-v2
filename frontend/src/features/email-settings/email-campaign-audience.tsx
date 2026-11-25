import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { Loader2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import type { useEmailCampaigns } from './use-email-campaigns'

/**
 * Publika kampanje i akcije slanja (S9).
 *
 * Izdvojeno iz `email-campaigns-panel.tsx` bez promjene: isti role prekidači
 * (s istim `htmlFor`/`id` parovima), isti `Badge` sa brojem primalaca, ista
 * poruka „saglasnost je obavezna“ i iste akcije (izračun publike / pošalji).
 *
 * Uvjeti za slanje su isti kao prije: kampanja mora biti izabrana, publika
 * mora biti neprazna i ne smije preći limit.
 */
export function EmailCampaignAudience({
  campaigns,
}: {
  campaigns: ReturnType<typeof useEmailCampaigns>
}) {
  const { t, i18n } = useTranslation()

  return (
    <div className="space-y-3">
      <p className="font-semibold text-content">
        {t('emailSettings.campaigns.audienceHeading')}
      </p>
      <div className="flex flex-wrap gap-2">
        {['CLIENT', 'STYLIST', 'SYSTEM_ADMIN', 'OWNER'].map((role) => (
          <Button
            key={role}
            type="button"
            size="sm"
            variant={campaigns.campaignRoles.includes(role) ? 'default' : 'outline'}
            onClick={() => campaigns.handleToggleCampaignRole(role)}
          >
            {t(`users.roleNames.${role}`)}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="email-campaign-only-active-audience" className="mb-0">{t('emailSettings.campaigns.onlyActiveUsers')}</Label>
          <Switch id="email-campaign-only-active-audience"
            checked={campaigns.onlyActiveAudience}
            onCheckedChange={(checked) => {
              campaigns.setOnlyActiveAudience(checked)
              campaigns.setAudienceSummary(null)
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="email-campaign-create-in-app-notification" className="mb-0">{t('emailSettings.campaigns.createInAppNotification')}</Label>
          <Switch id="email-campaign-create-in-app-notification"
            checked={campaigns.createInAppNotification}
            onCheckedChange={campaigns.setCreateInAppNotification}
          />
        </div>
      </div>
      <p className="text-xs text-content-strong">
        {t('emailSettings.campaigns.verifiedConsentOnly')}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void campaigns.handleLoadAudiencePreview()}
          disabled={campaigns.loadingAudience}
        >
          {campaigns.loadingAudience ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
          {t('emailSettings.campaigns.calculateAudience')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void campaigns.handleSendCampaign()}
          disabled={campaigns.sendingCampaign || campaigns.loadingAudience || !campaigns.audienceSummary || campaigns.audienceSummary.exceedsLimit}
        >
          {campaigns.sendingCampaign ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
          {t('emailSettings.campaigns.sendCampaign')}
        </Button>
      </div>

      {campaigns.audienceSummary ? (
        <div className="space-y-2">
          <Badge variant="brand" className="w-fit px-3 py-1">
            {t('emailSettings.campaigns.totalRecipients', {
              total: formatLocalizedNumber(
                campaigns.audienceSummary.exceedsLimit
                  ? campaigns.audienceSummary.maxRecipients + 1
                  : campaigns.audienceSummary.total,
                i18n.language,
              ) + (campaigns.audienceSummary.exceedsLimit ? '+' : ''),
            })}
          </Badge>
          {campaigns.audienceSummary.exceedsLimit ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {t('emailSettings.campaigns.audienceLimitReached')}
            </p>
          ) : null}
          {campaigns.audienceSummary.total === 0 ? (
            <p className="text-sm text-content-strong ">
              {t('emailSettings.campaigns.audienceEmpty')}
            </p>
          ) : (
            <p className="text-sm text-content-strong ">
              {t('emailSettings.campaigns.sampleFirstTen', {
                names: campaigns.audienceSummary.sample.map((item) => item.username).join(', ') || '-',
              })}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
