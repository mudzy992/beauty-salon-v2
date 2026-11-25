import { useTranslation } from 'react-i18next'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import { Check, Eye, Loader2, Trash2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { useTableScrollRegion } from '../shell/admin/ui/use-table-scroll-region'
import { ReviewStars } from './review-stars'
import { getUserName, type Review } from './review-types'

/**
 * Tabela admin recenzija (S9).
 *
 * Markup prenesen iz `pages/Reviews.tsx` bez promjene: istih 9 naslova kolona sa
 * `scope="col"`, isti `<caption className="sr-only">`, `data-table` klasa,
 * `data-label` na svakoj ćeliji (ili `colSpan` za prazno stanje) i iste akcije.
 *
 * Boje (S9): `emerald-600` (3.77:1) → `ok-foreground`; `rose-600` (4.70:1, ispod
 * praga u Aurum svijetloj) → `danger` (6.54:1).
 */
export function ReviewsTable({
  reviews,
  loading,
  openDetail,
  onApprove,
  onDelete,
}: {
  reviews: Review[]
  loading: boolean
  openDetail: (review: Review) => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const scrollRegion = useTableScrollRegion()

  const getApprovalBadge = (isApproved: boolean | null) => {
    if (isApproved === true) return <Badge variant="success">{t('reviews.approved')}</Badge>
    if (isApproved === false) return <Badge variant="danger">{t('reviews.rejected')}</Badge>
    return <Badge variant="warning">{t('reviews.pending')}</Badge>
  }

  return (
    <Card className="aurum-scroll-table-card overflow-hidden">
      {loading ? (
        <div className="flex justify-center p-10 text-content-strong">
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-label={t('common.loading')} />
        </div>
      ) : (
        <div ref={scrollRegion} data-m2-scroll-region role="region" aria-label={t('reviews.tableCaption')} className="app-table-wrap">
          <table className="app-table data-table w-full border-collapse">
            <caption className="sr-only">{t('reviews.tableCaption')}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                <th scope="col" className="p-3 font-medium">{t('reviews.client')}</th>
                <th scope="col" className="p-3 font-medium">{t('reviews.service')}</th>
                <th scope="col" className="p-3 font-medium">{t('reviews.stylist')}</th>
                <th scope="col" className="p-3 font-medium">{t('reviews.serviceRating')}</th>
                <th scope="col" className="p-3 font-medium">{t('reviews.stylistRating')}</th>
                <th scope="col" className="p-3 font-medium">{t('reviews.comment')}</th>
                <th scope="col" className="p-3 font-medium">{t('common.status')}</th>
                <th scope="col" className="p-3 font-medium">{t('common.date')}</th>
                <th scope="col" className="p-3 text-right font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-content-strong">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                reviews.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-line hover:bg-surface-muted"
                    onClick={() => openDetail(r)}
                  >
                    <td data-label={t('reviews.client')} className="p-3 font-medium text-content">{getUserName(r.user)}</td>
                    <td data-label={t('reviews.service')} className="p-3">{r.service?.name ?? '-'}</td>
                    <td data-label={t('reviews.stylist')} className="p-3">{getUserName(r.stylist?.user)}</td>
                    <td data-label={t('reviews.serviceRating')} className="p-3">
                      <ReviewStars count={r.serviceRating} />
                    </td>
                    <td data-label={t('reviews.stylistRating')} className="p-3">{r.stylistRating ? <ReviewStars count={r.stylistRating} /> : '-'}</td>
                    <td data-review-comment data-label={t('reviews.comment')} className="max-w-[220px] truncate p-3">{r.comment ?? '-'}</td>
                    <td data-label={t('common.status')} className="p-3">{getApprovalBadge(r.isApproved)}</td>
                    <td data-label={t('common.date')} className="p-3">{Number.isFinite(new Date(r.createdAt).getTime())
                      ? new Intl.DateTimeFormat(getIntlLocale(i18n.language), { dateStyle: 'medium' }).format(new Date(r.createdAt))
                      : '—'}</td>
                    <td data-label={t('common.actions')} className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {/* 2.1.1 (Level A): cijeli redak ima onClick koji otvara dijalog
                            detalja, ali <tr> nije fokusabilan i nema tastaturni handler —
                            mis je bio JEDINI put. Ovo dugme je pristupacni put; obrazac je
                            vec postojeci (Reservations.tsx, ClientAnalytics.tsx). */}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={t('reviews.details')}
                          onClick={() => openDetail(r)}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        {r.isApproved !== true ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={t('reviews.approve')}
                            onClick={() => void onApprove(r.id)}
                          >
                            <Check className="h-4 w-4 text-ok-foreground" aria-hidden="true" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={t('reviews.delete')}
                          onClick={() => void onDelete(r.id)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
