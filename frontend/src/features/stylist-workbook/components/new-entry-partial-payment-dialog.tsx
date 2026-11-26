import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { formatKm } from '../workbook-amount'

/**
 * Dijalog za djelimično plaćenje u radnoj knjizi (S10).
 *
 * Izdvojeno iz `pages/workbook-new-entry-page.tsx` **bez promjene ponašanja**:
 * isti redoslijed dugmadi (otkazi → zanemar dug → evidentiraj dug), isti
 * `debtHandling` za svaku granu, ista poruka o iznosu duga i isti `disabled`
 * dok je slanje u toku.
 *
 * `onOpenChange` je namjerno „zapovijedna": `true` ne mijenja stanje (otvoren je
 * samo iz forme), `false` zatvara dijalog — isto kao prije izdvajanja.
 */
export const NewEntryPartialPaymentDialog = ({
  open,
  onOpenChange,
  partialDiff,
  saving,
  onIgnoreDebt,
  onRecordDebt,
  locale,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  partialDiff: number
  saving: boolean
  onIgnoreDebt: () => void | Promise<void>
  onRecordDebt: () => void | Promise<void>
  locale: string
}) => {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onOpenChange(false)
          return
        }
        onOpenChange(true)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistWorkbook.newEntry.partialPaymentTitle')}</DialogTitle>
          <DialogDescription>
            {t('stylistWorkbook.newEntry.partialPaymentDescription', {
              amount: formatKm(partialDiff, locale),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="outline" onClick={() => void onIgnoreDebt()} disabled={saving}>
            {t('stylistWorkbook.newEntry.ignoreDebt')}
          </Button>
          <Button type="button" onClick={() => void onRecordDebt()} disabled={saving}>
            {t('stylistWorkbook.newEntry.recordDebt')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
