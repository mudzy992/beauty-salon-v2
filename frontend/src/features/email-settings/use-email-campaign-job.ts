import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import type { CampaignJobSummary } from './email-settings-types'

/**
 * Status posla kampanje (S9).
 *
 * Izdvojeno iz `use-email-campaigns.ts` bez promjene: isti polling (2 s dok je
 * `QUEUED`/`RUNNING`, 5 s nakon greške), ista „preuzimanje“ poruka i isti retry
 * sa `confirmAtLeastOnce` + `crypto.randomUUID()`.
 */
export function useEmailCampaignJob({
  setConfirmRequest,
}: {
  setConfirmRequest: (request: AdminConfirmRequest | null) => void
}) {
  const { t } = useTranslation()
  const { error: toastError } = useAppToast()

  const [campaignJobId, setCampaignJobId] = useState<string | null>(null)
  const [campaignJob, setCampaignJob] = useState<CampaignJobSummary | null>(null)
  const [campaignJobLoadFailed, setCampaignJobLoadFailed] = useState(false)
  const [campaignJobActionBusy, setCampaignJobActionBusy] = useState(false)

  useEffect(() => {
    if (!campaignJobId) return
    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined

    const refresh = async () => {
      try {
        const { data } = await api.get<CampaignJobSummary>(
          `/api/notifications/campaigns/${campaignJobId}`,
        )
        if (!active) return
        setCampaignJob(data)
        setCampaignJobLoadFailed(false)
        if (data.status === 'QUEUED' || data.status === 'RUNNING') {
          timeout = setTimeout(refresh, 2000)
        }
      } catch {
        if (!active) return
        setCampaignJobLoadFailed(true)
        timeout = setTimeout(refresh, 5000)
      }
    }

    void refresh()
    return () => {
      active = false
      if (timeout) clearTimeout(timeout)
    }
  }, [campaignJobId])

  const handleCancelCampaign = async () => {
    if (!campaignJobId) return
    setCampaignJobActionBusy(true)
    try {
      const { data } = await api.post<{ ok: boolean } & CampaignJobSummary>(
        `/api/notifications/campaigns/${campaignJobId}/cancel`,
      )
      setCampaignJob(data)
      setCampaignJobLoadFailed(false)
    } catch {
      toastError(t('emailSettings.campaigns.cancelFailed'))
    } finally {
      setCampaignJobActionBusy(false)
    }
  }

  const handleRetryFailedCampaign = () => {
    if (!campaignJobId) return
    setConfirmRequest({
      title: t('common.confirmTitle'),
      description: t('emailSettings.campaigns.retryConfirmAtLeastOnce'),
      confirmLabel: t('common.confirm'),
      action: async () => {
        setCampaignJobActionBusy(true)
        try {
          const { data } = await api.post<{ ok: boolean } & CampaignJobSummary>(
            `/api/notifications/campaigns/${campaignJobId}/retry`,
            { confirmAtLeastOnce: true, requestId: crypto.randomUUID() },
          )
          setCampaignJob(data)
          setCampaignJobLoadFailed(false)
        } catch {
          toastError(t('emailSettings.campaigns.retryFailedMessage'))
        } finally {
          setCampaignJobActionBusy(false)
        }
      },
    })
  }

  return {
    campaignJobId,
    setCampaignJobId,
    campaignJob,
    setCampaignJob,
    campaignJobLoadFailed,
    setCampaignJobLoadFailed,
    campaignJobActionBusy,
    handleCancelCampaign,
    handleRetryFailedCampaign,
  }
}
