import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedDateTime, formatLocalizedNumber, getIntlLocale } from '../i18n/locale-utils.mjs'
import { Check, Loader2, Star, Trash2 } from 'lucide-react'

import api from '../api/client'
import { useAppToast } from '../lib/toast/useAppToast'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'

interface Review {
  id: string
  serviceRating: number
  stylistRating: number | null
  comment: string | null
  isApproved: boolean | null
  createdAt: string
  service?: { name: string }
  stylist?: { user?: { firstName: string | null; lastName: string | null } }
  user?: { firstName: string | null; lastName: string | null }
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < count ? 'h-4 w-4 fill-yellow-400 text-yellow-400' : 'h-4 w-4 text-slate-300 dark:text-slate-700'}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export default function Reviews() {
  const { t, i18n } = useTranslation()
  const { success, error } = useAppToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

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

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('reviews.deleteConfirm'))) return
    try {
      await api.delete(`/api/reviews/${id}`)
      success(t('reviews.deletedSuccess'))
      loadData()
      if (detail?.id === id) setOpen(false)
    } catch {
      error(t('reviews.actionFailed'))
    }
  }

  const openDetail = (r: Review) => {
    setDetail(r)
    setOpen(true)
  }

  const getApprovalBadge = (isApproved: boolean | null) => {
    if (isApproved === true) return <Badge variant="success">{t('reviews.approved')}</Badge>
    if (isApproved === false) return <Badge variant="danger">{t('reviews.rejected')}</Badge>
    return <Badge variant="warning">{t('reviews.pending')}</Badge>
  }

  const getUserName = (user?: { firstName: string | null; lastName: string | null }) => {
    if (!user) return '-'
    const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    return full || '-'
  }

  const detailDate = useMemo(() => {
    if (!detail?.createdAt) return null
    return formatLocalizedDateTime(detail.createdAt, i18n.language)
  }, [detail?.createdAt, i18n.language])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.reviews')}</h1>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">{t('reviews.allReviews')}</option>
          <option value="pending">{t('reviews.pending')}</option>
          <option value="approved">{t('reviews.approved')}</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-label={t('common.loading')} />
          </div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="p-3 font-medium">{t('reviews.client')}</th>
                  <th className="p-3 font-medium">{t('reviews.service')}</th>
                  <th className="p-3 font-medium">{t('reviews.stylist')}</th>
                  <th className="p-3 font-medium">{t('reviews.serviceRating')}</th>
                  <th className="p-3 font-medium">{t('reviews.stylistRating')}</th>
                  <th className="p-3 font-medium">{t('reviews.comment')}</th>
                  <th className="p-3 font-medium">{t('common.status')}</th>
                  <th className="p-3 font-medium">{t('common.date')}</th>
                  <th className="p-3 text-right font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-slate-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  reviews.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                      onClick={() => openDetail(r)}
                    >
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{getUserName(r.user)}</td>
                      <td className="p-3">{r.service?.name ?? '-'}</td>
                      <td className="p-3">{getUserName(r.stylist?.user)}</td>
                      <td className="p-3">
                        <Stars count={r.serviceRating} />
                      </td>
                      <td className="p-3">{r.stylistRating ? <Stars count={r.stylistRating} /> : '-'}</td>
                      <td className="max-w-[220px] truncate p-3">{r.comment ?? '-'}</td>
                      <td className="p-3">{getApprovalBadge(r.isApproved)}</td>
                      <td className="p-3">{Number.isFinite(new Date(r.createdAt).getTime())
                        ? new Intl.DateTimeFormat(getIntlLocale(i18n.language), { dateStyle: 'medium' }).format(new Date(r.createdAt))
                        : '—'}</td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {r.isApproved !== true ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={t('reviews.approve')}
                              onClick={() => void handleApprove(r.id)}
                            >
                              <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={t('reviews.delete')}
                            onClick={() => void handleDelete(r.id)}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('reviews.detailsTitle')}</DialogTitle>
          </DialogHeader>

          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900 dark:text-slate-50">{t('common.status')}</p>
                {getApprovalBadge(detail.isApproved)}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">{t('reviews.client')}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{getUserName(detail.user)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('reviews.service')}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{detail.service?.name ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('reviews.stylist')}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{getUserName(detail.stylist?.user)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">{t('reviews.serviceRating')}</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <Stars count={detail.serviceRating} />
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{formatLocalizedNumber(detail.serviceRating, i18n.language)}/{formatLocalizedNumber(5, i18n.language)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('reviews.stylistRating')}</p>
                  {detail.stylistRating ? (
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <Stars count={detail.stylistRating} />
                      <span className="font-semibold text-slate-900 dark:text-slate-50">{formatLocalizedNumber(detail.stylistRating, i18n.language)}/{formatLocalizedNumber(5, i18n.language)}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-500">{t('reviews.notRated')}</p>
                  )}
                </div>
              </div>

              {detail.comment ? (
                <div>
                  <p className="text-xs text-slate-500">{t('reviews.comment')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-900 dark:text-slate-50">{detail.comment}</p>
                </div>
              ) : null}

              <p className="text-xs text-slate-500">{t('common.date')}: {detailDate ?? '-'}</p>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            {detail && detail.isApproved !== true ? (
              <Button type="button" onClick={() => void handleApprove(detail.id)}>
                {t('reviews.approve')}
              </Button>
            ) : null}
            {detail ? (
              <Button type="button" variant="outline" onClick={() => void handleDelete(detail.id)}>
                {t('reviews.delete')}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
