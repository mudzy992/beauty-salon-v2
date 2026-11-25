import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'

/**
 * Testiranje SMTP-a (S9).
 *
 * Izdvojeno iz `use-email-smtp.ts` bez promjene: isti endpointi
 * (`/api/notifications/test-email`, `/api/notifications/test-smtp-connection`),
 * iste poruke i ista obavezna validacija adrese za test email.
 */
export function useEmailSmtpActions() {
  const { t } = useTranslation()
  const { success, error: toastError, warning } = useAppToast()

  const [sendingTest, setSendingTest] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const handleSendTestEmail = async (testEmailTo: string) => {
    if (!testEmailTo.trim()) {
      warning(t('emailSettings.smtp.testEmailRequired'))
      return
    }
    setSendingTest(true)
    try {
      await api.post('/api/notifications/test-email', { to: testEmailTo.trim() })
      success(t('emailSettings.smtp.testEmailSent'), t('emailSettings.smtp.checkInbox'))
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.smtp.testEmailFailed'))
    } finally {
      setSendingTest(false)
    }
  }

  const handleSendTestToMe = async () => {
    setSendingTest(true)
    try {
      await api.post('/api/notifications/test-email', {})
      success(t('emailSettings.smtp.testEmailSentToAdmin'), t('emailSettings.smtp.checkInbox'))
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.smtp.testEmailFailed'))
    } finally {
      setSendingTest(false)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      await api.post('/api/notifications/test-smtp-connection', {})
      success(t('emailSettings.smtp.connectionSuccess'))
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.smtp.connectionFailed'))
    } finally {
      setTestingConnection(false)
    }
  }

  return {
    sendingTest,
    testingConnection,
    handleSendTestEmail,
    handleSendTestToMe,
    handleTestConnection,
  }
}
