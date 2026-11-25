import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import type { useEmailSmtp } from './use-email-smtp'

/**
 * Brisanje sačuvane lozinke (S9).
 *
 * Izdvojeno iz `email-smtp-connection.tsx` bez promjene: isti `variant="ghost"`,
 * ista klasa (`shrink-0 text-danger`) i isti poziv `requestClearPassword()`
 * koji otvara `AdminConfirmDialog` (3.3.4 — potvrda prije brisanja).
 */
export function EmailSmtpClearPassword({ smtp }: { smtp: ReturnType<typeof useEmailSmtp> }) {
  const { t } = useTranslation()

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="shrink-0 text-danger"
      onClick={() => {
        smtp.requestClearPassword()
      }}
    >
      {t('emailSettings.smtp.clearPassword')}
    </Button>
  )
}
