import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  stylistProfile?: { user?: { username: string; firstName: string | null; lastName: string | null } }
  user?: { username: string; firstName: string | null; lastName: string | null }
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
  const { t } = useTranslation()
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
      .get<Review[]>('/api/reviews', { params })
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
      success('Recenzija odobrena')
      loadData()
    } catch {
      error('Greška')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Obrisati recenziju?')) return
    try {
      await api.delete(`/api/reviews/${id}`)
      success('Recenzija obrisana')
      loadData()
      if (detail?.id === id) setOpen(false)
    } catch {
      error('Greška')
    }
  }

  const openDetail = (r: Review) => {
    setDetail(r)
    setOpen(true)
  }

  const getApprovalBadge = (isApproved: boolean | null) => {
    if (isApproved === true) return <Badge variant="success">Odobreno</Badge>
    if (isApproved === false) return <Badge variant="danger">Odbijeno</Badge>
    return <Badge variant="warning">Na čekanju</Badge>
  }

  const getUserName = (user?: { username: string; firstName: string | null; lastName: string | null }) => {
    if (!user) return '-'
    const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    return full || user.username
  }

  const detailDate = useMemo(() => {
    if (!detail?.createdAt) return null
    return new Date(detail.createdAt).toLocaleString('bs-BA')
  }, [detail?.createdAt])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.reviews')}</h1>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">Sve recenzije</option>
          <option value="pending">Na čekanju</option>
          <option value="approved">Odobrene</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="p-3 font-medium">Klijent</th>
                  <th className="p-3 font-medium">Servis</th>
                  <th className="p-3 font-medium">Stilista</th>
                  <th className="p-3 font-medium">Ocjena servisa</th>
                  <th className="p-3 font-medium">Ocjena stiliste</th>
                  <th className="p-3 font-medium">Komentar</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Datum</th>
                  <th className="p-3 text-right font-medium">Akcije</th>
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
                      <td className="p-3">{getUserName(r.stylistProfile?.user)}</td>
                      <td className="p-3">
                        <Stars count={r.serviceRating} />
                      </td>
                      <td className="p-3">{r.stylistRating ? <Stars count={r.stylistRating} /> : '-'}</td>
                      <td className="max-w-[220px] truncate p-3">{r.comment ?? '-'}</td>
                      <td className="p-3">{getApprovalBadge(r.isApproved)}</td>
                      <td className="p-3">{new Date(r.createdAt).toLocaleDateString('bs-BA')}</td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {r.isApproved !== true ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label="Odobri"
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
                            aria-label="Obriši"
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
            <DialogTitle>Detalji recenzije</DialogTitle>
          </DialogHeader>

          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900 dark:text-slate-50">Status</p>
                {getApprovalBadge(detail.isApproved)}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Klijent</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{getUserName(detail.user)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Servis</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{detail.service?.name ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Stilista</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{getUserName(detail.stylistProfile?.user)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Ocjena servisa</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <Stars count={detail.serviceRating} />
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{detail.serviceRating}/5</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ocjena stiliste</p>
                  {detail.stylistRating ? (
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <Stars count={detail.stylistRating} />
                      <span className="font-semibold text-slate-900 dark:text-slate-50">{detail.stylistRating}/5</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-500">Nije ocijenjen</p>
                  )}
                </div>
              </div>

              {detail.comment ? (
                <div>
                  <p className="text-xs text-slate-500">Komentar</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-900 dark:text-slate-50">{detail.comment}</p>
                </div>
              ) : null}

              <p className="text-xs text-slate-500">Datum: {detailDate ?? '-'}</p>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            {detail && detail.isApproved !== true ? (
              <Button type="button" onClick={() => void handleApprove(detail.id)}>
                Odobri
              </Button>
            ) : null}
            {detail ? (
              <Button type="button" variant="outline" onClick={() => void handleDelete(detail.id)}>
                Obriši
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Zatvori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
