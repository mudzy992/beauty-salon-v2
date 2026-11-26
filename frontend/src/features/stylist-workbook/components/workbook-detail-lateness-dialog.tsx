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

/**
 * Ponuda za promjenu termina nakon kašnjenja (S10).
 *
 * Izdvojeno iz `pages/workbook-detail-page.tsx` **bez promjene**: isti naslov,
 * isti opis sa brojem minuta, i **iste tri akcije** — „ne sada", „bez pauza"
 * i „sa pauzama". Izbor se i dalje prenosi **URL-om** (`includeBreaks=0` /
 * `includeBreaks=1`), pa se preview stranica ne pita ponovo (3.3.7).
 */
export const WorkbookDetailLatenessDialog = ({
  open,
  onOpenChange,
  overrunMinutes,
  onNotNow,
  onPreview,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  overrunMinutes: number
  onNotNow: () => void
  /** Otvara preview promjene termina; `includeBreaks` se prenosi URL-om. */
  onPreview: (includeBreaks: boolean) => void
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistWorkbook.detail.latenessTitle')}</DialogTitle>
          <DialogDescription>
            {t('stylistWorkbook.detail.latenessDescription', {
              minutes: overrunMinutes,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onNotNow}
          >
            {t('stylistWorkbook.detail.notNow')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onPreview(false)}
          >
            {t('stylistWorkbook.detail.withoutBreaks')}
          </Button>
          <Button
            type="button"
            onClick={() => onPreview(true)}
          >
            {t('stylistWorkbook.detail.includeBreaks')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
