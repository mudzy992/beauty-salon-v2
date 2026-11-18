import { useTranslation } from 'react-i18next'

import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'
import type { ReservationPaymentSummary } from '../reservations/types'

type PaymentSummaryBlockProps = {
  payment: ReservationPaymentSummary
}

export const PaymentSummaryBlock = ({ payment }: PaymentSummaryBlockProps) => {
  const { t, i18n } = useTranslation()

  return (
    <div data-aurum-surface className="space-y-3 rounded-xl border border-line/80 bg-surface-sunken/60 p-4">
      <div>
        <p className="text-sm font-semibold text-content">
          {t('public.myReservations.payment.title')}
        </p>
        <p className="text-xs text-content-muted mt-0.5">{payment.publicReferenceCode}</p>
      </div>
      <div className="space-y-2 text-sm">
        {payment.items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex justify-between gap-3">
            <span className="text-content-strong">{item.name}</span>
            <span className="font-medium text-content">
              {formatLocalizedAmount(item.unitPrice, i18n.language)}
            </span>
          </div>
        ))}
        {payment.loyaltyDiscountAmount > 0 ? (
          <div className="flex justify-between gap-3 text-emerald-700">
            <span>{t('public.myReservations.payment.loyaltyDiscount')}</span>
            <span>−{formatLocalizedAmount(payment.loyaltyDiscountAmount, i18n.language)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 text-content-strong">
          <span>{t('public.myReservations.payment.tip')}</span>
          <span>{formatLocalizedAmount(payment.tipAmount, i18n.language)}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-line pt-3 font-semibold text-content">
          <span>{t('public.myReservations.payment.totalCharged')}</span>
          <span>{formatLocalizedAmount(payment.actualPrice, i18n.language)}</span>
        </div>
      </div>
      <p className="text-sm text-content-strong">{t('public.myReservations.payment.thanks')}</p>
    </div>
  )
}
