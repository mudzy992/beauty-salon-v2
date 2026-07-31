type Props = {
  paidAmount: string
  chargeAmount: number
}

export const TipPreview = ({ paidAmount, chargeAmount }: Props) => {
  const paidRaw =
    paidAmount.trim().length > 0 ? Number(paidAmount.replace(',', '.')) : NaN
  const tipPreview =
    Number.isFinite(paidRaw) && paidRaw > chargeAmount ? paidRaw - chargeAmount : 0
  if (tipPreview <= 0) return null
  return (
    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
      Napojnica: {tipPreview.toFixed(2)} KM
    </p>
  )
}
