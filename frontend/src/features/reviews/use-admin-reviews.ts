import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import type { Review } from './review-types'

export type ReviewFilter = 'all' | 'pending' | 'approved'

/**
 * Stanje i akcije admin recenzija (S9).
 *
 * Izdvojeno iz `pages/Reviews.tsx` bez promjene ponašanja: isti endpoint
 * (`GET /api/reviews/admin` sa `approved` filterom), ista odobrenja i brisanja,
 * ista potvrda prije brisanja i isti toast poruke.
 */
export function useAdminReviews() {
  const { t } = useTranslation()
  const { success, error } = useAppToast()

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)

  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Review | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (filter === 'approved') params.approved = 'true'
    else if (filter === 'pending') params.approved = 'false'
    api
      .get<Review[]>('/api/reviews/admin', { params })
      .then((r) => setReviews(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/api/reviews/${id}/approve`)
      success(t('reviews.approvedSuccess'))
      loadData()
    } catch {
      error(t('reviews.actionFailed'))
    }
  }

  const handleDelete = (id: string) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('reviews.deleteConfirm'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/reviews/${id}`)
          success(t('reviews.deletedSuccess'))
          loadData()
          if (detail?.id === id) setOpen(false)
        } catch {
          error(t('reviews.actionFailed'))
        }
      },
    })
  }

  const openDetail = (r: Review) => {
    setDetail(r)
    setOpen(true)
  }

  return {
    reviews,
    loading,
    filter,
    setFilter,
    confirmRequest,
    setConfirmRequest,
    open,
    setOpen,
    detail,
    loadData,
    handleApprove,
    handleDelete,
    openDetail,
  }
}
