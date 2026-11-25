import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { AdminConfirmDialog, type AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import { ReviewStars } from './review-stars'
import { getUserName, type Review } from './review-types'

/**
 * Dijalog detalja recenzije (S9).
 *
 * Markup prNESEN iz `pages/Reviews.tsx` bez promjene: isti nazivi, ista oznaka
 * statusa i iste akcije (odobri / obriši / zatvori).
 */
export function ReviewsDetailDialog({
  open,
  onOpenChange,
  detail,
  confirmRequest,
  onCloseConfirm,
  onApprove,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: Review | null
  confirmRequest: AdminConfirmRequest | null
  onCloseConfirm: () => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { t, i18n } = useTranslation()

  const getApprovalBadge = (isApproved: boolean | null) => {
    if (isApproved === true) return <Badge variant="success">{t('reviews.approved')}</Badge>
    if (isApproved === false) return <Badge variant="danger">{t('reviews.rejected')}</Badge>
    return <Badge variant="warning">{t('reviews.pending')}</Badge>
  }

  const detailDate = useMemo(() => {
    if (!detail?.createdAt) return null
    return formatLocalizedDateTime(detail.createdAt, i18n.language)
  }, [detail?.createdAt, i18n.language])

  return (
    <Dialog open={open} onOpenChange={(next) => {
      // Close the nested confirmation first if the parent receives dismissal.
      if (!next && confirmRequest) onCloseConfirm()
      else onOpenChange(next)
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('reviews.detailsTitle')}</DialogTitle>
        </DialogHeader>

        {detail ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-content">{t('common.status')}</p>
              {getApprovalBadge(detail.isApproved)}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs text-content-strong">{t('reviews.client')}</p>
                <p className="font-medium text-content">{getUserName(detail.user)}</p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('reviews.service')}</p>
                <p className="font-medium text-content">{detail.service?.name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('reviews.stylist')}</p>
                <p className="font-medium text-content">{getUserName(detail.stylist?.user)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs text-content-strong">{t('reviews.serviceRating')}</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <ReviewStars count={detail.serviceRating} />
                  <span className="font-semibold text-content">{formatLocalizedNumber(detail.serviceRating, i18n.language)}/{formatLocalizedNumber(5, i18n.language)}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('reviews.stylistRating')}</p>
                {detail.stylistRating ? (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <ReviewStars count={detail.stylistRating} />
                    <span className="font-semibold text-content">{formatLocalizedNumber(detail.stylistRating, i18n.language)}/{formatLocalizedNumber(5, i18n.language)}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-content-strong">{t('reviews.notRated')}</p>
                )}
              </div>
            </div>

            {detail.comment ? (
              <div>
                <p className="text-xs text-content-strong">{t('reviews.comment')}</p>
                <p className="mt-1 whitespace-pre-wrap text-content">{detail.comment}</p>
              </div>
            ) : null}

            <p className="text-xs text-content-strong">{t('common.date')}: {detailDate ?? '-'}</p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          {detail && detail.isApproved !== true ? (
            <Button type="button" onClick={() => void onApprove(detail.id)}>
              {t('reviews.approve')}
            </Button>
          ) : null}
          {detail ? (
            <Button type="button" variant="outline" onClick={() => void onDelete(detail.id)}>
              {t('reviews.delete')}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
        <AdminConfirmDialog request={confirmRequest} onClose={onCloseConfirm} />
      </DialogContent>
    </Dialog>
  )
}
