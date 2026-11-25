import { useTranslation } from 'react-i18next'

import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'
import { EmailSmtpClearPassword } from './email-smtp-clear-password'
import { EmailSmtpLimits } from './email-smtp-limits'
import { PROVIDERS } from './email-settings-constants'
import type { ProviderType } from './email-settings-types'
import type { useEmailSmtp } from './use-email-smtp'

/**
 * SMTP konfiguracija servera (S9).
 *
 * Izdvojeno iz `email-smtp-panel.tsx` bez promjene: isti `htmlFor`/`id` parovi,
 * isti preset izbor i ista grupa „Maks. konekcija / maks. poruka“ sa
 * `role="group"` + `aria-labelledby` i po jednim `aria-label` po polju.
 */
export function EmailSmtpConnection({ smtp }: { smtp: ReturnType<typeof useEmailSmtp> }) {
  const { t } = useTranslation()
  const selectClass =
    'flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-content'

  return (
    <>
      <div>
        <Label htmlFor="email-smtp-provider">{t('emailSettings.smtp.provider')}</Label>
        <Select id="email-smtp-provider"
          className={`${selectClass} mt-1`}
          value={smtp.provider}
          onChange={(event) => smtp.handleProviderChange(event.target.value as ProviderType)}
        >
          {PROVIDERS.map((item) => (
            <option key={item.id} value={item.id}>
              {t(`emailSettings.providers.${item.id}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="email-smtp-host">{t('emailSettings.smtp.host')}</Label>
          <Input id="email-smtp-host" className="mt-1" value={smtp.host} onChange={(event) => smtp.setHost(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="email-smtp-port">{t('emailSettings.smtp.port')}</Label>
          <Input id="email-smtp-port" className="mt-1" value={smtp.port} onChange={(event) => smtp.setPort(event.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="email-smtp-secure" className="mb-0">{t('emailSettings.smtp.secure')}</Label>
          <Switch id="email-smtp-secure" checked={smtp.secure} onCheckedChange={smtp.setSecure} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="email-smtp-reject-unauthorized" className="mb-0">{t('emailSettings.smtp.rejectUnauthorized')}</Label>
          <Switch id="email-smtp-reject-unauthorized" checked={smtp.rejectUnauthorized} onCheckedChange={smtp.setRejectUnauthorized} />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="email-smtp-require-tls" className="mb-0">{t('emailSettings.smtp.requireTls')}</Label>
          <Switch id="email-smtp-require-tls" checked={smtp.requireTls} onCheckedChange={smtp.setRequireTls} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="email-smtp-ignore-tls" className="mb-0">{t('emailSettings.smtp.ignoreTls')}</Label>
          <Switch id="email-smtp-ignore-tls" checked={smtp.ignoreTls} onCheckedChange={smtp.setIgnoreTls} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="email-smtp-pool" className="mb-0">{t('emailSettings.smtp.connectionPool')}</Label>
        <Switch id="email-smtp-pool" checked={smtp.pool} onCheckedChange={smtp.setPool} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="email-smtp-username">{t('emailSettings.smtp.username')}</Label>
          <Input id="email-smtp-username" className="mt-1" value={smtp.username} onChange={(event) => smtp.setUsername(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="email-smtp-password">{t('emailSettings.smtp.password')}</Label>
          <Input id="email-smtp-password"
            className="mt-1"
            type="password"
            value={smtp.password}
            onChange={(event) => smtp.setPassword(event.target.value)}
            placeholder={smtp.hasPasswordConfigured ? t('emailSettings.smtp.passwordSavedPlaceholder') : ''}
          />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs text-content-strong">
              {smtp.hasPasswordConfigured
                ? t('emailSettings.smtp.passwordSavedHint')
                : t('emailSettings.smtp.passwordEntryHint')}
            </p>
            {smtp.hasPasswordConfigured ? (
              <EmailSmtpClearPassword smtp={smtp} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="email-smtp-connection-timeout-ms">{t('emailSettings.smtp.connectionTimeout')}</Label>
          <Input id="email-smtp-connection-timeout-ms"
            className="mt-1"
            value={smtp.connectionTimeoutMs}
            onChange={(event) => smtp.setConnectionTimeoutMs(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email-smtp-greeting-timeout-ms">{t('emailSettings.smtp.greetingTimeout')}</Label>
          <Input id="email-smtp-greeting-timeout-ms"
            className="mt-1"
            value={smtp.greetingTimeoutMs}
            onChange={(event) => smtp.setGreetingTimeoutMs(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email-smtp-socket-timeout-ms">{t('emailSettings.smtp.socketTimeout')}</Label>
          <Input id="email-smtp-socket-timeout-ms"
            className="mt-1"
            value={smtp.socketTimeoutMs}
            onChange={(event) => smtp.setSocketTimeoutMs(event.target.value)}
          />
        </div>
        <EmailSmtpLimits smtp={smtp} />
      </div>

      {!smtp.isCustomLike ? (
        <p className="text-sm text-content-strong">
          {t('emailSettings.smtp.providerCredentialsHint', { provider: smtp.provider === 'google' ? 'Google' : 'Office 365' })}
        </p>
      ) : null}
    </>
  )
}

