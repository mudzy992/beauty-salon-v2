import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import { useEmailCampaignAudience } from './use-email-campaign-audience'
import { useEmailCampaignJob } from './use-email-campaign-job'
import { useEmailCampaignSettings } from './use-email-campaign-settings'

/**
 * Kampanje (S9).
 *
 * Ornkestrator: spaja tri pod-hooka — podešavanja template-a, publiku i
 * status posla — i drži slanje kampanje.
 *
 * Izdvojeno iz `pages/EmailSettings.tsx` **bez promjene**: isti idempotency
 * ključ (isti payload → isti `crypto.randomUUID()`), iste poruke i isti „retry“
 * sa `confirmAtLeastOnce`. `renderCampaignHtml` se koristi **iz istog
 * modula** kao i prije — dozvoljeni markup kampanje i njegova sanitizacija
 * nisu dirani.
 */
export function useEmailCampaigns({
  setConfirmRequest,
}: {
  setConfirmRequest: (request: AdminConfirmRequest | null) => void
}) {
  const { t, i18n } = useTranslation()
  const { success, error: toastError, warning } = useAppToast()

  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [campaignMode, setCampaignMode] = useState<'builder' | 'html'>('builder')
  const [campaignSubject, setCampaignSubject] = useState('')
  const [createInAppNotification, setCreateInAppNotification] = useState(true)

  const settings = useEmailCampaignSettings()
  const audience = useEmailCampaignAudience()
  const job = useEmailCampaignJob({ setConfirmRequest })

  const selectedCampaign = settings.selectedCampaign

  const handleSendCampaign = async () => {
    if (!selectedCampaign) {
      warning(t('emailSettings.campaigns.selectCampaignWarning'))
      return
    }
    if ((audience.audienceSummary?.total || 0) <= 0) {
      warning(t('emailSettings.campaigns.emptyAudienceWarning'))
      return
    }
    if (audience.audienceSummary?.exceedsLimit) {
      warning(t('emailSettings.campaigns.audienceLimitReached'))
      return
    }
    setSendingCampaign(true)
    try {
      const requestPayload = {
        templateId: selectedCampaign.id,
        subjectOverride: campaignSubject.trim() || undefined,
        campaignName: settings.campaignName.trim() || selectedCampaign.name,
        createInAppNotification,
        tags: ['marketing', 'campaign'],
        audience: audience.getAudiencePayload(),
      }
      const fingerprint = JSON.stringify(requestPayload)
      const requestId = settings.campaignRequestId.current?.fingerprint === fingerprint
        ? settings.campaignRequestId.current.key
        : crypto.randomUUID()
      settings.campaignRequestId.current = { key: requestId, fingerprint }
      const { data } = await api.post<{
        queued: boolean;
        jobId: string;
        totalTargeted: number;
      }>('/api/notifications/campaigns/send', {
        ...requestPayload,
        idempotencyKey: requestId,
      })
      settings.campaignRequestId.current = null
      job.setCampaignJob(null)
      job.setCampaignJobLoadFailed(false)
      job.setCampaignJobId(data.jobId)
      success(
        t('emailSettings.campaigns.queued'),
        t('emailSettings.campaigns.enqueueDetails', {
          total: formatLocalizedNumber(data.totalTargeted, i18n.language),
        }),
      )
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.campaigns.sendFailed'))
    } finally {
      setSendingCampaign(false)
    }
  }

  return {
    savingCampaigns: settings.savingCampaigns,
    sendingCampaign,
    loadingAudience: audience.loadingAudience,
    campaignTemplates: settings.campaignTemplates,
    selectedCampaignId: settings.selectedCampaignId,
    setSelectedCampaignId: settings.setSelectedCampaignId,
    campaignMode,
    setCampaignMode,
    campaignSubject,
    setCampaignSubject,
    campaignName: settings.campaignName,
    setCampaignName: settings.setCampaignName,
    campaignRoles: audience.campaignRoles,
    onlyActiveAudience: audience.onlyActiveAudience,
    setOnlyActiveAudience: audience.setOnlyActiveAudience,
    createInAppNotification,
    setCreateInAppNotification,
    audienceSummary: audience.audienceSummary,
    setAudienceSummary: audience.setAudienceSummary,
    selectedCampaign,
    applySettings: settings.applySettings,
    handleCreateCampaign: settings.handleCreateCampaign,
    updateSelectedCampaign: settings.updateSelectedCampaign,
    handleSaveCampaignTemplates: () => settings.handleSaveCampaignTemplates(campaignMode),
    handleToggleCampaignRole: audience.handleToggleCampaignRole,
    handleLoadAudiencePreview: audience.handleLoadAudiencePreview,
    handleSendCampaign,
    campaignJob: job.campaignJob,
    campaignJobLoadFailed: job.campaignJobLoadFailed,
    campaignJobActionBusy: job.campaignJobActionBusy,
    handleCancelCampaign: job.handleCancelCampaign,
    handleRetryFailedCampaign: job.handleRetryFailedCampaign,
  }
}
