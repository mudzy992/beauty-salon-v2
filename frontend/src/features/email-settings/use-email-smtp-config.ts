import { useTranslation } from 'react-i18next'

import { useAppToast } from '../../lib/toast/useAppToast'
import { upsertSetting, setValueFromSettings } from './email-settings-api'
import { KEYS, PRESETS } from './email-settings-constants'
import type { AppSetting, ProviderType } from './email-settings-types'
import type { useEmailSmtpState } from './use-email-smtp-state'

/**
 * Učitavanje i spremanje SMTP konfiguracije (S9).
 *
 * Izdvojeno iz `use-email-smtp.ts` bez promjene: isti ključevi postavki, isti
 * redoslijed `upsertSetting` poziva, ista validacija („host obavezan“, „from
 * email obavezan“) i iste toast poruke.
 *
 * **Lozinka se i dalje nikad ne šalje prazna** — šalje se samo ako je
 * unesena ili ako je traženo brisanje (`clearPasswordRequested`).
 */
export function useEmailSmtpConfig(state: ReturnType<typeof useEmailSmtpState>) {
  const { t } = useTranslation()
  const { success, error: toastError, warning } = useAppToast()

  /** Učitava SMTP dio odgovora `/api/settings` (bez side-effecta na mrežu). */
  const applySettings = (list: AppSetting[]) => {
    const hostVal = setValueFromSettings(list, KEYS.host)
    const providerValue: ProviderType =
      hostVal.includes('gmail')
        ? 'google'
        : hostVal.includes('office365') || hostVal.includes('outlook')
          ? 'office365'
          : hostVal
            ? 'custom'
            : 'google'
    state.setProvider(providerValue)
    state.setHost(hostVal || PRESETS[providerValue].host)
    state.setPort(setValueFromSettings(list, KEYS.port) || PRESETS[providerValue].port)
    state.setSecure((setValueFromSettings(list, KEYS.secure) || String(PRESETS[providerValue].secure)) === 'true')
    state.setUsername(setValueFromSettings(list, KEYS.username))
    const passwordItem = list.find((item) => item.key === KEYS.password) || null
    state.setHasPasswordConfigured(!!passwordItem?.isConfigured || !!passwordItem?.value?.trim())
    state.setClearPasswordRequested(false)
    state.setPassword('')
    state.setRejectUnauthorized((setValueFromSettings(list, KEYS.rejectUnauthorized) || 'true') === 'true')
    state.setRequireTls((setValueFromSettings(list, 'system_email_require_tls') || 'false') === 'true')
    state.setIgnoreTls((setValueFromSettings(list, 'system_email_ignore_tls') || 'false') === 'true')
    state.setConnectionTimeoutMs(setValueFromSettings(list, 'system_email_connection_timeout_ms') || '10000')
    state.setGreetingTimeoutMs(setValueFromSettings(list, 'system_email_greeting_timeout_ms') || '10000')
    state.setSocketTimeoutMs(setValueFromSettings(list, 'system_email_socket_timeout_ms') || '20000')
    state.setPool((setValueFromSettings(list, 'system_email_pool') || 'true') === 'true')
    state.setMaxConnections(setValueFromSettings(list, 'system_email_max_connections') || '5')
    state.setMaxMessages(setValueFromSettings(list, 'system_email_max_messages') || '100')
    state.setFromEmail(setValueFromSettings(list, KEYS.fromEmail))
    state.setFromName(setValueFromSettings(list, KEYS.fromName) || 'Beauty Salon')
    state.setReplyTo(setValueFromSettings(list, 'system_email_reply_to'))
    state.setSignature(setValueFromSettings(list, 'system_email_signature') || 'Beauty Salon Nejra')
    state.setPublicAppUrl(setValueFromSettings(list, 'system_public_app_url'))
    state.setTestEmailTo(setValueFromSettings(list, KEYS.fromEmail))
  }

  const handleProviderChange = (next: ProviderType) => {
    state.setProvider(next)
    const preset = PRESETS[next]
    if (preset.host) state.setHost(preset.host)
    state.setPort(preset.port)
    state.setSecure(preset.secure)
  }

  const handleSave = async () => {
    if (!state.host.trim()) {
      warning('SMTP host je obavezan.')
      return
    }
    if (!state.fromEmail.trim()) {
      warning('From email je obavezan.')
      return
    }
    state.setSaving(true)
    try {
      const ops: Array<Promise<unknown>> = [
        upsertSetting(KEYS.host, state.host.trim(), 'SMTP host'),
        upsertSetting(KEYS.port, state.port.trim(), 'SMTP port'),
        upsertSetting(KEYS.secure, String(state.secure), 'SMTP secure (SSL/TLS)'),
        upsertSetting(KEYS.username, state.username.trim(), 'SMTP username'),
        upsertSetting(KEYS.rejectUnauthorized, String(state.rejectUnauthorized), 'TLS reject unauthorized'),
        upsertSetting('system_email_require_tls', String(state.requireTls), 'SMTP require TLS'),
        upsertSetting('system_email_ignore_tls', String(state.ignoreTls), 'SMTP ignore TLS'),
        upsertSetting('system_email_connection_timeout_ms', state.connectionTimeoutMs.trim(), 'SMTP connection timeout (ms)'),
        upsertSetting('system_email_greeting_timeout_ms', state.greetingTimeoutMs.trim(), 'SMTP greeting timeout (ms)'),
        upsertSetting('system_email_socket_timeout_ms', state.socketTimeoutMs.trim(), 'SMTP socket timeout (ms)'),
        upsertSetting('system_email_pool', String(state.pool), 'SMTP pooled connections'),
        upsertSetting('system_email_max_connections', state.maxConnections.trim(), 'SMTP max pooled connections'),
        upsertSetting('system_email_max_messages', state.maxMessages.trim(), 'SMTP max messages per connection'),
        upsertSetting(KEYS.fromEmail, state.fromEmail.trim(), 'Email sender address'),
        upsertSetting(KEYS.fromName, state.fromName.trim(), 'Email sender name'),
        upsertSetting('system_email_reply_to', state.replyTo.trim(), 'Email reply-to address'),
        upsertSetting('system_email_signature', state.signature.trim(), 'Email template signature'),
        upsertSetting('system_public_app_url', state.publicAppUrl.trim(), 'Public app base URL for email links'),
      ]

      if (state.clearPasswordRequested) {
        ops.push(upsertSetting(KEYS.password, '', 'SMTP password/app password'))
      } else if (state.password.trim().length > 0) {
        ops.push(upsertSetting(KEYS.password, state.password, 'SMTP password/app password'))
      }

      await Promise.all(ops)
      success(t('emailSettings.smtp.settingsSaved'))
    } catch {
      toastError(t('emailSettings.smtp.settingsSaveFailed'))
    } finally {
      state.setSaving(false)
    }
  }

  return { applySettings, handleProviderChange, handleSave }
}
