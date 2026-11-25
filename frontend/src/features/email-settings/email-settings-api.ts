import api from '../../api/client'
import type { AppSetting } from './email-settings-types'

/**
 * Zajednički API pomoci za admin email postavke (S9).
 *
 * `upsertSetting` je isti `PUT /api/settings/:key` poziv kao prije — izdvojen
 * samo da ga troje hookova (SMTP, template-i, kampanje) dijele bez dupliranja.
 */
export const upsertSetting = async (key: string, value: string, description: string) => {
  await api.put(`/api/settings/${key}`, {
    value,
    description,
  })
}

export const setValueFromSettings = (settings: AppSetting[], key: string) =>
  settings.find((item) => item.key === key)?.value ?? ''
