import { useTranslation } from 'react-i18next'

import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import { useEmailSmtpActions } from './use-email-smtp-actions'
import { useEmailSmtpConfig } from './use-email-smtp-config'
import { useEmailSmtpState } from './use-email-smtp-state'

/**
 * SMTP konfiguracija admin email postavki (S9).
 *
 * Ornkestrator: spaja stanje (`use-email-smtp-state`), učitavanje/spašavanje
 * (`use-email-smtp-config`) i test akcije (`use-email-smtp-actions`).
 *
 * Izdvojeno iz `pages/EmailSettings.tsx` bez promjene: isti ključevi
 * postavki, isti redoslijed `upsertSetting` poziva, ista validacija („host
 * obavezan“, „from email obavezan“) i isti toast poruke. Lozinka se i dalje
 * nikad ne šalje prazna — šalje se samo ako je unesena ili ako je traženo
 * brisanje.
 */
export function useEmailSmtp({
  setConfirmRequest,
}: {
  setConfirmRequest: (request: AdminConfirmRequest | null) => void
}) {
  const { t } = useTranslation()
  const state = useEmailSmtpState()
  const config = useEmailSmtpConfig(state)
  const smtpActions = useEmailSmtpActions()

  const requestClearPassword = () => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('emailSettings.smtp.clearPasswordConfirm'),
      confirmLabel: t('emailSettings.smtp.clearPassword'),
      action: () => {
        state.setClearPasswordRequested(true)
        state.setHasPasswordConfigured(false)
        state.setPassword('')
      },
    })
  }

  return {
    provider: state.provider,
    isCustomLike: state.isCustomLike,
    host: state.host,
    port: state.port,
    secure: state.secure,
    username: state.username,
    password: state.password,
    hasPasswordConfigured: state.hasPasswordConfigured,
    rejectUnauthorized: state.rejectUnauthorized,
    requireTls: state.requireTls,
    ignoreTls: state.ignoreTls,
    connectionTimeoutMs: state.connectionTimeoutMs,
    greetingTimeoutMs: state.greetingTimeoutMs,
    socketTimeoutMs: state.socketTimeoutMs,
    pool: state.pool,
    maxConnections: state.maxConnections,
    maxMessages: state.maxMessages,
    fromEmail: state.fromEmail,
    fromName: state.fromName,
    replyTo: state.replyTo,
    signature: state.signature,
    publicAppUrl: state.publicAppUrl,
    testEmailTo: state.testEmailTo,
    saving: state.saving,
    sendingTest: smtpActions.sendingTest,
    testingConnection: smtpActions.testingConnection,
    setHost: state.setHost,
    setPort: state.setPort,
    setSecure: state.setSecure,
    setUsername: state.setUsername,
    setPassword: state.setPassword,
    setRejectUnauthorized: state.setRejectUnauthorized,
    setRequireTls: state.setRequireTls,
    setIgnoreTls: state.setIgnoreTls,
    setConnectionTimeoutMs: state.setConnectionTimeoutMs,
    setGreetingTimeoutMs: state.setGreetingTimeoutMs,
    setSocketTimeoutMs: state.setSocketTimeoutMs,
    setPool: state.setPool,
    setMaxConnections: state.setMaxConnections,
    setMaxMessages: state.setMaxMessages,
    setFromEmail: state.setFromEmail,
    setFromName: state.setFromName,
    setReplyTo: state.setReplyTo,
    setSignature: state.setSignature,
    setPublicAppUrl: state.setPublicAppUrl,
    setTestEmailTo: state.setTestEmailTo,
    applySettings: config.applySettings,
    handleProviderChange: config.handleProviderChange,
    handleSave: config.handleSave,
    handleSendTestEmail: () => smtpActions.handleSendTestEmail(state.testEmailTo),
    handleSendTestToMe: smtpActions.handleSendTestToMe,
    handleTestConnection: smtpActions.handleTestConnection,
    requestClearPassword,
  }
}
