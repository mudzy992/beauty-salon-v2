import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppToast } from '../../lib/toast/useAppToast'
import { upsertSetting } from './email-settings-api'
import { renderCampaignHtml } from './email-campaign-html'
import { CAMPAIGN_KEY } from './email-settings-constants'
import type {
  AppSetting,
  CampaignBlockType,
  CampaignTemplate,
  CampaignTemplateBlock,
} from './email-settings-types'

/**
 * Uredi i spremanje template-a kampanje (S9).
 *
 * Izdvojeno iz `use-email-campaigns.ts` bez promjene: isti kreiranje bloka
 * (ista struktura `id`/`type`/`content`/`secondary`), isti naziv nove
 * kampanje, isto normalizovanje prije spremanja (builder → `renderCampaignHtml`,
 * html → sirovo) i ista poruka o uspjehu/grešci.
 */
export function useEmailCampaignSettings() {
  const { t } = useTranslation()
  const { success, error: toastError } = useAppToast()

  const [savingCampaigns, setSavingCampaigns] = useState(false)
  const [campaignTemplates, setCampaignTemplates] = useState<CampaignTemplate[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [campaignName, setCampaignName] = useState('')
  const campaignRequestId = useRef<{ key: string; fingerprint: string } | null>(null)

  const selectedCampaign = campaignTemplates.find((item) => item.id === selectedCampaignId) || null

  /** Učitava kampanje iz već preuzete liste postavki. */
  const applySettings = (list: AppSetting[]) => {
    const campaignRaw = list.find((item) => item.key === CAMPAIGN_KEY)?.value
    const parsedCampaigns = campaignRaw ? (JSON.parse(campaignRaw) as CampaignTemplate[]) : []
    setCampaignTemplates(Array.isArray(parsedCampaigns) ? parsedCampaigns : [])
    if (Array.isArray(parsedCampaigns) && parsedCampaigns.length > 0) {
      setSelectedCampaignId(parsedCampaigns[0].id)
    }
  }

  const createCampaignBlock = (type: CampaignBlockType): CampaignTemplateBlock => ({
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    content:
      type === 'spacer' || type === 'divider'
        ? ''
        : t(`emailSettings.templates.blockPlaceholders.${type}`),
    ...(type === 'button' ? { secondary: '{{appUrl}}/rezervacija' } : {}),
  })

  const handleCreateCampaign = () => {
    const next: CampaignTemplate = {
      id: `campaign_${Date.now()}`,
      name: `Nova kampanja ${campaignTemplates.length + 1}`,
      html: '',
      blocks: [createCampaignBlock('title'), createCampaignBlock('text'), createCampaignBlock('button')],
    }
    const nextList = [next, ...campaignTemplates]
    setCampaignTemplates(nextList)
    setSelectedCampaignId(next.id)
  }

  const updateSelectedCampaign = (updater: (current: CampaignTemplate) => CampaignTemplate) => {
    if (!selectedCampaign) return
    const nextList = campaignTemplates.map((item) =>
      item.id === selectedCampaign.id ? updater(item) : item,
    )
    setCampaignTemplates(nextList)
  }

  const handleSaveCampaignTemplates = async (campaignMode: 'builder' | 'html') => {
    setSavingCampaigns(true)
    try {
      const normalized = campaignTemplates.map((item) => {
        const blocks = Array.isArray(item.blocks) ? item.blocks : []
        return {
          ...item,
          blocks,
          html: campaignMode === 'builder' ? renderCampaignHtml(blocks) : item.html,
        }
      })
      setCampaignTemplates(normalized)
      await upsertSetting(
        CAMPAIGN_KEY,
        JSON.stringify(normalized),
        'Email campaign templates (builder/html)',
      )
      success(t('emailSettings.campaigns.saved'))
    } catch {
      toastError(t('emailSettings.campaigns.saveFailed'))
    } finally {
      setSavingCampaigns(false)
    }
  }

  return {
    savingCampaigns,
    campaignTemplates,
    selectedCampaignId,
    setSelectedCampaignId,
    campaignName,
    setCampaignName,
    selectedCampaign,
    applySettings,
    handleCreateCampaign,
    updateSelectedCampaign,
    handleSaveCampaignTemplates,
    campaignRequestId,
  }
}
