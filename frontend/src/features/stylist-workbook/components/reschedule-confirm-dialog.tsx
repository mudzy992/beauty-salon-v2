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
 * Potvrda slanja novog rasporeda klijentima (S10).
 *
 * Izdvojeno iz `pages/workbook-reschedule-preview-page.tsx` **bez promjene**:
 * isti naslov, isti opis, isto otkazivanje i isti „pošalji" gumb sa spinnerom
 * koji mijenja naziv dugmeta.
 */
export const RescheduleConfirmDialog = ({
  open,
  onOpenChange,
  submitting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  submitting: boolean
  onConfirm: () => void
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistWorkbook.reschedule.confirmTitle')}</DialogTitle>
          <DialogDescription>
            {t('stylistWorkbook.reschedule.confirmDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {t('stylistWorkbook.reschedule.sending')}
              </>
            ) : (
              t('stylistWorkbook.reschedule.notify')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
