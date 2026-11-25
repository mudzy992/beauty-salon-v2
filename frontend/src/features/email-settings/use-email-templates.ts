import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import { upsertSetting } from './email-settings-api'
import {
  getExistingTemplateDefaults,
  normalizeExistingTemplate,
  TEMPLATE_DEFAULTS,
} from './email-template-defaults'
import type { AppSetting, ExistingTemplateConfig, ExistingTemplateType } from './email-settings-types'
import { setValueFromSettings } from './email-settings-api'

/**
 * Uređivanje postojećih email template-a (S9).
 *
 * Izdvojeno iz `pages/EmailSettings.tsx` bez promjene: isti ključ
 * `system_email_template_<type>`, isto učitavanje pri promjeni tipa template-a
 * i ista poruka o uspjehu.
 */
export function useEmailTemplates() {
  const { t } = useTranslation()
  const { success, error: toastError } = useAppToast()

  const [savingTemplate, setSavingTemplate] = useState(false)
  const [existingTemplateType, setExistingTemplateType] = useState<ExistingTemplateType>('verification')
  const [existingTemplate, setExistingTemplate] = useState<ExistingTemplateConfig>(() =>
    normalizeExistingTemplate(TEMPLATE_DEFAULTS),
  )

  /** Učitava template iz već preuzete liste postavki. */
  const applySettings = (list: AppSetting[]) => {
    const selectedTemplateRaw = setValueFromSettings(list, `system_email_template_${existingTemplateType}`)
    const loadedTemplate = selectedTemplateRaw
      ? {
          ...getExistingTemplateDefaults(existingTemplateType),
          ...(JSON.parse(selectedTemplateRaw) as Partial<ExistingTemplateConfig>),
        }
      : getExistingTemplateDefaults(existingTemplateType)
    setExistingTemplate(normalizeExistingTemplate(loadedTemplate))
  }

  useEffect(() => {
    const loadTemplateByType = async () => {
      try {
        const { data } = await api.get<AppSetting[]>('/api/settings')
        const list = Array.isArray(data) ? data : []
        const raw = setValueFromSettings(list, `system_email_template_${existingTemplateType}`)
        const loadedTemplate = raw
          ? {
              ...getExistingTemplateDefaults(existingTemplateType),
              ...(JSON.parse(raw) as Partial<ExistingTemplateConfig>),
            }
          : getExistingTemplateDefaults(existingTemplateType)
        setExistingTemplate(normalizeExistingTemplate(loadedTemplate))
      } catch {
        setExistingTemplate(normalizeExistingTemplate(getExistingTemplateDefaults(existingTemplateType)))
      }
    }
    loadTemplateByType()
  }, [existingTemplateType])

  const handleSaveExistingTemplate = async () => {
    setSavingTemplate(true)
    try {
      await upsertSetting(
        `system_email_template_${existingTemplateType}`,
        JSON.stringify(existingTemplate),
        `Email template config for ${existingTemplateType}`,
      )
      success(t('emailSettings.templates.templateSaved'))
    } catch {
      toastError(t('emailSettings.templates.templateSaveFailed'))
    } finally {
      setSavingTemplate(false)
    }
  }

  return {
    savingTemplate,
    existingTemplateType,
    setExistingTemplateType,
    existingTemplate,
    setExistingTemplate,
    applySettings,
    handleSaveExistingTemplate,
  }
}
