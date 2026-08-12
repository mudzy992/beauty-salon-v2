import type { ReservationPaymentSummary } from '../reservations/types'

type PaymentSummaryBlockProps = {
  payment: ReservationPaymentSummary
}

export const PaymentSummaryBlock = ({ payment }: PaymentSummaryBlockProps) => (
  <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
    <div>
      <p className="text-sm font-semibold text-slate-950">Uplata</p>
      <p className="text-xs text-slate-500 mt-0.5">{payment.publicReferenceCode}</p>
    </div>
    <div className="space-y-2 text-sm">
      {payment.items.map((item, index) => (
        <div key={`${item.name}-${index}`} className="flex justify-between gap-3">
          <span className="text-slate-700">{item.name}</span>
          <span className="font-medium text-slate-950">{item.unitPrice.toFixed(2)} KM</span>
        </div>
      ))}
      {payment.loyaltyDiscountAmount > 0 ? (
        <div className="flex justify-between gap-3 text-emerald-700">
          <span>Loyalty popust</span>
          <span>−{payment.loyaltyDiscountAmount.toFixed(2)} KM</span>
        </div>
      ) : null}
      <div className="flex justify-between gap-3 text-slate-600">
        <span>Napojnica</span>
        <span>{payment.tipAmount.toFixed(2)} KM</span>
      </div>
      <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 font-semibold text-slate-950">
        <span>Ukupno naplaćeno</span>
        <span>{payment.actualPrice.toFixed(2)} KM</span>
      </div>
    </div>
    <p className="text-sm text-slate-600">Hvala vam na povjerenju!</p>
  </div>
)
