import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import type { LoyaltyInfo } from '../types'
import { formatLocalizedNumber } from '../../../i18n/locale-utils.mjs'
import { formatKm } from '../workbook-amount'

/**
 * Kartica lojalnosti za novi unos u radnoj knjizi (S10).
 *
 * Izdvojeno iz `pages/workbook-new-entry-page.tsx` **bez promjene ponašanja**.
 *
 * WCAG 1.3.1 — `aria-labelledby` pokazuje na **postojeći vidljivi naslov**
 * (`stylistWorkbook.newEntry.loyalty`), pa nije dodan nijedan novi vidljivi
 * element. WCAG 4.1.3 — stanje učitavanja i sažetak su u `role="status"`
 * regiji sa `aria-live="polite"`.
 */
export const NewEntryLoyaltyCard = ({
  loyaltyLabelId,
  discountPercentId,
  loyaltyInfo,
  loadingLoyalty,
  desiredLoyaltyPercent,
  onDesiredLoyaltyPercentChange,
  locale,
}: {
  loyaltyLabelId: string
  discountPercentId: string
  loyaltyInfo: LoyaltyInfo | null
  loadingLoyalty: boolean
  desiredLoyaltyPercent: number
  onDesiredLoyaltyPercentChange: (value: number) => void
  locale: string
}) => {
  const { t } = useTranslation()
  const hasLoyalty = Boolean(
    loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service,
  )

  // Sažetak se računa izvan JSX-a da ostane na jednoj liniji — inače `role="status"`
  // regija padne izvan prozora koji `workbook-loading-status-a11y` čuva za loader-e.
  const loyaltySummary = loadingLoyalty
    ? t('common.loading')
    : hasLoyalty
      ? t('stylistWorkbook.newEntry.loyaltySummary', {
          points: formatLocalizedNumber(loyaltyInfo?.points ?? 0, locale, {
            maximumFractionDigits: 0,
          }),
          percent: formatLocalizedNumber(loyaltyInfo!.service!.maxDiscountPercent, locale, {
            maximumFractionDigits: 0,
          }),
        })
      : t('stylistWorkbook.newEntry.loyaltyUnavailable')

  return (
    <Card className="p-4" role="group" aria-labelledby={loyaltyLabelId}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id={loyaltyLabelId} className="text-sm font-semibold text-content">
            {t('stylistWorkbook.newEntry.loyalty')}
          </p>
          <p role="status" aria-live="polite" className="mt-1 text-sm text-content-strong">
            {loyaltySummary}
          </p>
        </div>
        {loadingLoyalty ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-content-muted" aria-hidden="true" />
        ) : null}
      </div>

      {hasLoyalty ? (
        <div className="mt-3">
          <Label htmlFor={discountPercentId}>{t('stylistWorkbook.newEntry.discountPercent')}</Label>
          <Input
            id={discountPercentId}
            type="number"
            className="mt-2 max-w-[140px]"
            min={0}
            max={loyaltyInfo!.service!.maxDiscountPercent}
            value={desiredLoyaltyPercent}
            onChange={(e) => onDesiredLoyaltyPercentChange(Number(e.target.value) || 0)}
          />
          <p className="mt-2 text-xs text-content-strong">
            {t('stylistWorkbook.newEntry.maxDiscountAmount', {
              amount: formatKm(Number(loyaltyInfo!.service!.maxDiscountAmount ?? 0), locale),
            })}
          </p>
        </div>
      ) : null}
    </Card>
  )
}
