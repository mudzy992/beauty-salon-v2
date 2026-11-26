import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'

/**
 * Potvrda završetka unosa (S10).
 *
 * Izdvojeno iz `pages/workbook-detail-page.tsx` **bez promjene**: isti naslov,
 * isti opis (zavisi da li unos ima rezervaciju), isto otkazivanje i isti
 * „završi" gumb sa spinnerom koji mijenja naziv dugmeta.
 */
export const WorkbookDetailCompleteDialog = ({
  open,
  onOpenChange,
  acting,
  hasReservation,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  acting: boolean
  hasReservation: boolean
  onConfirm: () => void
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistWorkbook.detail.confirmTitle')}</DialogTitle>
          <DialogDescription>
            {hasReservation
              ? t('stylistWorkbook.detail.confirmReservation')
              : t('stylistWorkbook.detail.confirmEntry')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={acting}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={acting}>
            {acting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {t('stylistWorkbook.detail.finishing')}
              </>
            ) : (
              t('stylistWorkbook.detail.finish')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
