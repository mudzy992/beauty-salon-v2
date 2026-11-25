import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { CampaignAudienceSummary } from './email-settings-types'

/**
 * Publika kampanje (S9).
 *
 * Izdvojeno iz `use-email-campaigns.ts` bez promjene: isti payload
 * (`roles` + `onlyActive`), isti endpoint `/api/notifications/campaigns/audience`,
 * isti uslovi za slanje (neprazna publika, limit) i iste poruke.
 */
export function useEmailCampaignAudience() {
  const { t } = useTranslation()
  const { error: toastError } = useAppToast()

  const [loadingAudience, setLoadingAudience] = useState(false)
  const [audienceSummary, setAudienceSummary] = useState<CampaignAudienceSummary | null>(null)
  const [campaignRoles, setCampaignRoles] = useState<string[]>(['CLIENT'])
  const [onlyActiveAudience, setOnlyActiveAudience] = useState(true)

  const getAudiencePayload = () => ({
    roles: campaignRoles,
    onlyActive: onlyActiveAudience,
  })

  const handleToggleCampaignRole = (role: string) => {
    setCampaignRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role],
    )
    setAudienceSummary(null)
  }

  const handleLoadAudiencePreview = async () => {
    setAudienceSummary(null)
    setLoadingAudience(true)
    try {
      const { data } = await api.post<CampaignAudienceSummary>(
        '/api/notifications/campaigns/audience',
        getAudiencePayload(),
      )
      setAudienceSummary(data)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.campaigns.audienceLoadFailed'))
    } finally {
      setLoadingAudience(false)
    }
  }

  return {
    loadingAudience,
    audienceSummary,
    setAudienceSummary,
    campaignRoles,
    onlyActiveAudience,
    setOnlyActiveAudience,
    getAudiencePayload,
    handleToggleCampaignRole,
    handleLoadAudiencePreview,
  }
}
