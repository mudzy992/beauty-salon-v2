import { useTranslation } from 'react-i18next'

import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { formatLocalizedNumber } from '../../../i18n/locale-utils.mjs'
import { formatKm } from '../workbook-amount'

/**
 * Kartica podataka o naplati za novi unos u radnoj knjizi (S10).
 *
 * Izdvojeno iz `pages/workbook-new-entry-page.tsx` **bez promjene ponašanja**.
 *
 * WCAG 1.3.1 — tri polja (datum, iznos, napomena) su u `role="group"` kartici
 * sa programskim nazivom (`sr-only` + `aria-labelledby`), jer je `Card` običan
 * `<div>` i vizuelna kutija sama po sebi nije programski odrediva veza.
 * `sr-only` je potvrđen u buildovanom CSS-u (`dist/assets/index-*.css`).
 */
export const NewEntryPaymentCard = ({
  dateId,
  paidAmountId,
  notesId,
  paymentGroupLabelId,
  date,
  onDateChange,
  paidAmount,
  onPaidAmountChange,
  notes,
  onNotesChange,
  basePrice,
  loyaltyPercent,
  loyaltyDiscountAmount,
  chargeAmount,
  locale,
}: {
  dateId: string
  paidAmountId: string
  notesId: string
  paymentGroupLabelId: string
  date: string
  onDateChange: (value: string) => void
  paidAmount: string
  onPaidAmountChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  basePrice: number
  loyaltyPercent: number
  loyaltyDiscountAmount: number
  chargeAmount: number
  locale: string
}) => {
  const { t } = useTranslation()

  return (
    <Card className="p-4 space-y-3" role="group" aria-labelledby={paymentGroupLabelId}>
      <span id={paymentGroupLabelId} className="sr-only">
        {t('stylistWorkbook.newEntry.paymentSection')}
      </span>
      <div>
        <Label htmlFor={dateId}>{t('stylistWorkbook.newEntry.date')}</Label>
        <Input
          id={dateId}
          type="date"
          className="mt-2 max-w-[220px]"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor={paidAmountId}>{t('stylistWorkbook.newEntry.paidAmount')}</Label>
        <Input
          id={paidAmountId}
          className="mt-2 max-w-[220px]"
          value={paidAmount}
          placeholder={formatLocalizedNumber(chargeAmount, locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          onChange={(e) => onPaidAmountChange(e.target.value)}
        />
        <div className="mt-2 text-sm text-content-strong">
          {t('stylistWorkbook.newEntry.serviceTotal', { amount: formatKm(basePrice, locale) })}
          {loyaltyPercent > 0
            ? ` · ${t('stylistWorkbook.newEntry.loyaltyDiscount', {
                percent: formatLocalizedNumber(loyaltyPercent, locale, { maximumFractionDigits: 0 }),
                amount: formatKm(loyaltyDiscountAmount, locale),
              })}`
            : ''}
        </div>
        <div className="mt-1 text-sm font-semibold text-content">
          {t('stylistWorkbook.newEntry.amountDue', { amount: formatKm(chargeAmount, locale) })}
        </div>
      </div>

      <div>
        <Label htmlFor={notesId}>{t('stylistWorkbook.newEntry.notesOptional')}</Label>
        <Textarea
          id={notesId}
          className="mt-2"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
        />
      </div>
    </Card>
  )
}
