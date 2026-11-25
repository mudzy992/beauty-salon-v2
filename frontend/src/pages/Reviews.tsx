import { useTranslation } from 'react-i18next'

import { Select } from '../components/ui/select'
import { ReviewsDetailDialog } from '../features/reviews/reviews-detail-dialog'
import { ReviewsTable } from '../features/reviews/reviews-table'
import { useAdminReviews } from '../features/reviews/use-admin-reviews'
import { AdminConfirmDialog } from '../features/shell/admin/ui/admin-confirm-dialog'

/**
 * Admin recenzije (S9).
 *
 * Stranica je **orkestrator**: stanje i akcije su u
 * `features/reviews/use-admin-reviews.ts`, tabela u `reviews-table.tsx`, a dijalog
 * detalja u `reviews-detail-dialog.tsx`. Markup, filter, putanje API-ja i poruke
 * su **nepromijenjeni** — pomjereni su u module.
 */
export default function Reviews() {
  const { t } = useTranslation()
  const reviews = useAdminReviews()

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-content">{t('nav.reviews')}</h1>
        {/* 1.3.1/3.3.2/4.1.2: filter nije imao NI vidljivu NI programsku labelu —
            AT ga je imenovao tek po izabranoj opciji. Vidljiva labela bi bila
            dizajnerska promjena, pa je dodata programska. */}
        <Select
          aria-label={t('reviews.filterLabel')}
          className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-content shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface"
          value={reviews.filter}
          onChange={(e) => reviews.setFilter(e.target.value as typeof reviews.filter)}
        >
          <option value="all">{t('reviews.allReviews')}</option>
          <option value="pending">{t('reviews.pending')}</option>
          <option value="approved">{t('reviews.approved')}</option>
        </Select>
      </div>

      <ReviewsTable
        reviews={reviews.reviews}
        loading={reviews.loading}
        openDetail={reviews.openDetail}
        onApprove={(id) => void reviews.handleApprove(id)}
        onDelete={(id) => void reviews.handleDelete(id)}
      />

      <ReviewsDetailDialog
        open={reviews.open}
        onOpenChange={reviews.setOpen}
        detail={reviews.detail}
        confirmRequest={reviews.confirmRequest}
        onCloseConfirm={() => reviews.setConfirmRequest(null)}
        onApprove={(id) => void reviews.handleApprove(id)}
        onDelete={(id) => void reviews.handleDelete(id)}
      />
      {!reviews.open && (
        <AdminConfirmDialog
          request={reviews.confirmRequest}
          onClose={() => reviews.setConfirmRequest(null)}
        />
      )}
    </div>
  )
}
