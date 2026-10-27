import { useTranslation } from 'react-i18next'

import type { ClientDebt } from '../types'
import { formatLocalizedAmount, getIntlLocale } from '../../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../../shared/business-date.mjs'

type ClientDebtSelectorProps = {
  debts: ClientDebt[]
  isLoading: boolean
  profileId: string | null
  selectedDebtIds: Record<string, boolean>
  selectedDebtSum: number
  onToggle: (debtId: string) => void
}

const formatDebtDate = (createdAt: string, locale: string) => {
  try {
    return formatDateOnlyLocale(createdAt.slice(0, 10), locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return createdAt.slice(0, 10)
  }
}

export const ClientDebtSelector = ({
  debts,
  isLoading,
  profileId,
  selectedDebtIds,
  selectedDebtSum,
  onToggle,
}: ClientDebtSelectorProps) => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        {t('stylistPortal.reservationDialogs.complete.debtsTitle')}
      </p>
      {isLoading ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('stylistPortal.reservationDialogs.complete.debtsLoading')}
        </p>
      ) : debts.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('stylistPortal.reservationDialogs.complete.noDebts')}
        </p>
      ) : (
        <div className="grid gap-2">
          {debts.slice(0, 6).map((debt) => {
            const selected = !!selectedDebtIds[debt.id]
            const stylistName = debt.stylistProfile?.user
              ? `${debt.stylistProfile.user.firstName ?? ''} ${debt.stylistProfile.user.lastName ?? ''}`.trim() ||
                t('stylistPortal.reservationDialogs.complete.stylistFallback')
              : t('stylistPortal.reservationDialogs.complete.stylistFallback')
            return (
              <button
                key={debt.id}
                type="button"
                onClick={() => onToggle(debt.id)}
                className={
                  selected
                    ? 'w-full rounded-md border border-brand-champagne bg-brand-champagne/10 px-3 py-2 text-left'
                    : 'w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/30'
                }
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {debt.service?.name ?? t('stylistPortal.reservationDialogs.complete.serviceFallback')} ·{' '}
                  {formatLocalizedAmount(debt.amount, i18n.language)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {debt.stylistProfileId === profileId
                    ? t('stylistPortal.reservationDialogs.complete.debtWithYou')
                    : t('stylistPortal.reservationDialogs.complete.debtWithStylist', {
                        stylist: stylistName,
                      })}{' '}
                  · {formatDebtDate(debt.createdAt, locale)}
                </p>
              </button>
            )
          })}
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t('stylistPortal.reservationDialogs.complete.selectedDebtsHint')}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t('stylistPortal.reservationDialogs.complete.selectedDebtsTotal', {
              amount: formatLocalizedAmount(selectedDebtSum, i18n.language),
            })}
          </p>
        </div>
      )}
    </div>
  )
}
