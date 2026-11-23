import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../features/shell/admin/ui/page-header'
import { useTableScrollRegion } from '../features/shell/admin/ui/use-table-scroll-region'
import {
  ArrowLeft,
  Eye,
  Loader2,
  TriangleAlert,
} from 'lucide-react'
import type { ClientAnalyticsData } from '../features/client-analytics/client-analytics-types'
import { useClientAnalyticsData } from '../features/client-analytics/use-client-analytics-data'
import { ClientAnalyticsDetailDialog } from '../features/client-analytics/client-analytics-detail-dialog'
import { StarRating } from '../features/client-analytics/star-rating'
import { cn } from '../lib/cn'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import type { BadgeProps } from '../components/ui/badge'
import { formatLocalizedAmount, formatLocalizedNumber, getIntlLocale } from '../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'

const statusBadgeVariant: Record<string, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'warning',
  STYLIST_REVIEW: 'warning',
  CONFIRMED: 'secondary',
  ATTENDANCE_CONFIRMED: 'secondary',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_STYLISTS: 'danger',
  NO_SHOW: 'secondary',
}

// Each tab mounts its own region, so overflow focusability updates when it becomes active.
const AnalyticsTableRegion = ({ label, children }: { label: string; children: ReactNode }) => {
  const ref = useTableScrollRegion()
  return <div ref={ref} className="app-table-wrap" role="region" aria-label={label}>{children}</div>
}

const SmallStatCard = ({
  title,
  value,
  hint,
  className,
}: {
  title: string
  value: string
  hint?: string
  className?: string
}) => (
  <Card className={cn('p-4', className)}>
    <p className="text-xs text-content-strong">{title}</p>
    <p className="mt-1 text-2xl font-semibold text-content [overflow-wrap:anywhere]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-content-strong">{hint}</p> : null}
  </Card>
)

export default function ClientAnalytics() {
  const { t, i18n } = useTranslation()
  const formatDateOnly = (value: string | null | undefined) =>
    value
      ? formatDateOnlyLocale(value.slice(0, 10), getIntlLocale(i18n.language), {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—'
  const formatInstantDate = (value: string | null | undefined) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat(getIntlLocale(i18n.language), { dateStyle: 'medium' }).format(date)
      : '—'
  }
  const getReservationStatusLabel = (status: string) =>
    t(`reservations.statuses.${status}`, { defaultValue: status })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedUserId = searchParams.get('userId')
  const appliedFrom = searchParams.get('fromDate') ?? ''
  const appliedTo = searchParams.get('toDate') ?? ''
  const detailTriggerRef = useRef<HTMLElement | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailReservation, setDetailReservation] = useState<ClientAnalyticsData['reservations'][0] | null>(null)
  const [detailReview, setDetailReview] = useState<ClientAnalyticsData['reviews'][0] | null>(null)
  const {
    analytics, loading, dateFrom, setDateFrom, dateTo, setDateTo,
    clientDebts, debtsLoading, loadError, debtsError, setRetryVersion,
  } = useClientAnalyticsData({ selectedUserId, appliedFrom, appliedTo })

  const applyDateFilter = () => {
    if (!selectedUserId || !dateFrom || !dateTo || dateFrom > dateTo) return
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      next.set('tab', 'clients')
      next.set('userId', selectedUserId)
      next.set('fromDate', dateFrom)
      next.set('toDate', dateTo)
      return next
    })
  }

  const clearDateFilter = () => {
    setDateFrom('')
    setDateTo('')
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      next.set('tab', 'clients')
      next.delete('fromDate')
      next.delete('toDate')
      return next
    })
  }

  const goBack = () => {
    navigate('/admin/users')
  }

  const openReservationDetail = (r: ClientAnalyticsData['reservations'][0], trigger: HTMLElement | null) => {
    detailTriggerRef.current = trigger
    setDetailReservation(r)
    setDetailReview(null)
    setDetailOpen(true)
  }

  const openReviewDetail = (r: ClientAnalyticsData['reviews'][0], trigger: HTMLElement) => {
    detailTriggerRef.current = trigger
    setDetailReview(r)
    setDetailReservation(null)
    setDetailOpen(true)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailReservation(null)
    setDetailReview(null)
  }

  const getStylistName = (s?: { user?: { firstName: string | null; lastName: string | null; username: string } }) => {
    if (!s?.user) return '-'
    return `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.username
  }

  const getUserName = (u: { firstName: string | null; lastName: string | null; username: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username

  if (!selectedUserId) {
    return <Navigate to="/admin/users" replace />
  }

  return (
    <div>
      <Button type="button" variant="ghost" className="mb-4" onClick={goBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('clientAnalyticsPage.backToUsers')}
      </Button>

      {/* 2.4.6: stranica mora imati <h1> u SVIM stanjima (loading/error/loaded),
          pa je naslov staticki, a ime klijenta ide u opis kad je ucitano. */}
      <PageHeader
        title={t('clientAnalyticsPage.title')}
        description={analytics?.user ? getUserName(analytics.user) : undefined}
      />

          <div className="flex flex-col flex-wrap gap-3 md:flex-row md:items-end">
            <div className="w-full md:w-auto">
              <Label htmlFor="client-from" className="text-sm">
                {t('clientAnalyticsPage.fromDate')}
              </Label>
              <Input id="client-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 md:max-w-[160px]" />
            </div>
            <div className="w-full md:w-auto">
              <Label htmlFor="client-to" className="text-sm">
                {t('clientAnalyticsPage.toDate')}
              </Label>
              <Input id="client-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 md:max-w-[160px]" />
            </div>
            <Button type="button" size="sm" onClick={applyDateFilter} disabled={!dateFrom || !dateTo || dateFrom > dateTo} className="md:mb-0.5">
              {t('clientAnalyticsPage.applyPeriod')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearDateFilter} className="md:mb-0.5">
              {t('clientAnalyticsPage.fullPeriod')}
            </Button>
            {analytics && (analytics.fromDate || analytics.toDate) ? (
              <p className="pb-1 text-sm text-content-strong md:self-center">
                {t('clientAnalyticsPage.showingPeriod', { from: formatDateOnly(analytics.fromDate), to: formatDateOnly(analytics.toDate) })}
              </p>
            ) : null}
          </div>

          {dateFrom && dateTo && dateFrom > dateTo ? <p role="alert" className="text-sm text-content">{t('adminAnalytics.invalidRange')}</p> : null}

      {loading ? (
        <div role="status" className="flex justify-center py-10 text-content-strong">
          <span className="sr-only">{t('clientAnalyticsPage.loading')}</span>
          <Loader2 className="h-10 w-10 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>
      ) : null}

      {loadError && !loading ? (
        <div role="alert" className="space-y-3">
          <p>{t('clientAnalyticsPage.loadError')}</p>
          <Button type="button" variant="outline" onClick={() => setRetryVersion(value => value + 1)}>{t('common.retry')}</Button>
        </div>
      ) : null}

      {analytics && !loading ? (
        <div className="space-y-6">
          <p className="text-sm text-content">{t('clientAnalyticsPage.sourceNote')}</p>
          <Card className="p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-content">{getUserName(analytics.user)}</h2>
                <p className="text-sm text-content-strong">{analytics.user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-content-strong">{t('clientAnalyticsPage.phone')}: {analytics.user.phone ?? '-'}</p>
                  <Badge variant={analytics.user.isActive ? 'success' : 'danger'} className="text-[10px]">
                    {analytics.user.isActive ? t('clientAnalyticsPage.active') : t('clientAnalyticsPage.inactive')}
                  </Badge>
                  {analytics.user.userRoles?.map((r) => (
                    <Badge key={r.role.name} variant="secondary" className="text-[10px]">
                      {r.role.name}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-content-strong">{t('clientAnalyticsPage.registered')}: {formatInstantDate(analytics.user.createdAt)}</p>
              </div>

              {analytics.penalty.isPenalized ? (
                <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
                  <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-200">
                    <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                    {t('clientAnalyticsPage.penalized').toLocaleUpperCase(i18n.language)}
                  </div>
                  <p className="mt-1 text-sm text-rose-600 dark:text-rose-200">
                    {t('clientAnalyticsPage.until')}: {formatInstantDate(analytics.penalty.penaltyUntil)}
                  </p>
                </Card>
              ) : null}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            <SmallStatCard
              title={t('clientAnalyticsPage.stats.reservations')}
              value={String(analytics.stats.totalReservations)}
              hint={t('clientAnalyticsPage.stats.completed', { count: analytics.stats.completedReservations })}
            />
            <SmallStatCard
              title={t('clientAnalyticsPage.stats.cancelledNoShow')}
              value={`${analytics.stats.cancelledReservations} / ${analytics.stats.noShowCount}`}
              className="border-rose-100 dark:border-rose-900/30"
            />
            <SmallStatCard
              title={t('clientAnalyticsPage.stats.manualEntries')}
              value={String(analytics.stats.manualEntryCount)}
              hint={formatLocalizedAmount(analytics.stats.manualSpent, i18n.language)}
            />
            <SmallStatCard
              title={t('clientAnalyticsPage.stats.totalSpent')}
              value={formatLocalizedAmount(analytics.stats.totalSpent, i18n.language)}
              hint={t('clientAnalyticsPage.stats.reservationsPlusManual')}
            />
            <SmallStatCard
              title={t('clientAnalyticsPage.stats.penalties')}
              value={t('clientAnalyticsPage.stats.cancellations', { count: analytics.penalty.cancellationCount })}
              hint={analytics.penalty.isPenalized ? t('clientAnalyticsPage.penalized') : t('clientAnalyticsPage.stats.ok')}
              className={analytics.penalty.isPenalized ? 'border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20' : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SmallStatCard
              title={t('clientAnalyticsPage.stats.averageRating')}
              value={analytics.stats.avgServiceRating != null
                ? formatLocalizedNumber(analytics.stats.avgServiceRating, i18n.language, { maximumFractionDigits: 2 })
                : '-'}
              hint={t('clientAnalyticsPage.stats.reviewCount', { count: analytics.stats.reviewCount })}
            />
            {analytics.stats.totalReservations > 0 ? (
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-content">{t('clientAnalyticsPage.stats.completionRate')}</p>
                  <p className="text-sm font-semibold text-content">
                    {Math.round((analytics.stats.completedReservations / analytics.stats.totalReservations) * 100)}%
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-md bg-surface-muted">
                  <div
                    className="h-full rounded-md bg-ok-foreground"
                    style={{ width: `${(analytics.stats.completedReservations / analytics.stats.totalReservations) * 100}%` }}
                  />
                </div>
              </Card>
            ) : null}
          </div>

          {analytics.topServices.length > 0 ? (
            <Card className="p-5 aurum-scroll-table-card">
              <p className="mb-3 font-semibold text-content">{t('clientAnalyticsPage.topServices')}</p>
              <AnalyticsTableRegion label={t('clientAnalyticsPage.servicesCaption')}>
                <table className="app-table data-table w-full border-collapse">
                  <caption className="sr-only">{t('clientAnalyticsPage.servicesCaption')}</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                      <th scope="col" className="py-2 pr-3 font-medium">{t('clientAnalyticsPage.service')}</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">{t('clientAnalyticsPage.visitCount')}</th>
                      <th scope="col" className="py-2 text-right font-medium">{t('clientAnalyticsPage.total')} (KM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topServices.map((s, i) => (
                      <tr key={`${s.name}-${i}`} className="border-b border-line">
                        <td data-label={t('clientAnalyticsPage.service')} className="py-2 pr-3 font-medium">{s.name}</td>
                        <td data-label={t('clientAnalyticsPage.visitCount')} className="py-2 pr-3 text-right tabular-nums">{s.count}</td>
                        <td data-label={t('clientAnalyticsPage.total')} className="py-2 text-right tabular-nums">{formatLocalizedNumber(s.totalSpent, i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AnalyticsTableRegion>
            </Card>
          ) : null}

          <Tabs defaultValue="reservations">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
              <TabsTrigger value="reservations">{t('clientAnalyticsPage.tabs.reservations')} ({analytics.reservations.length})</TabsTrigger>
              <TabsTrigger value="manual">{t('clientAnalyticsPage.tabs.manualEntries')} ({analytics.manualEntries.length})</TabsTrigger>
              <TabsTrigger value="debts">{t('clientAnalyticsPage.tabs.debts')}{!debtsLoading && !debtsError ? ` (${clientDebts.length})` : ''}</TabsTrigger>
              <TabsTrigger value="reviews">{t('clientAnalyticsPage.tabs.reviews')} ({analytics.reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="reservations" className="mt-4">
              <Card className="overflow-hidden aurum-scroll-table-card">
                <AnalyticsTableRegion label={t('clientAnalyticsPage.reservationsCaption')}>
                  <table className="app-table data-table w-full border-collapse">
                    <caption className="sr-only">{t('clientAnalyticsPage.reservationsCaption')}</caption>
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                        <th scope="col" className="py-3 pl-4 pr-3 font-medium">{t('clientAnalyticsPage.date')}</th>
                        <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.time')}</th>
                        <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.service')}</th>
                        <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.stylist')}</th>
                        <th scope="col" className="py-3 pr-3 text-right font-medium">{t('clientAnalyticsPage.price')}</th>
                        <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.status')}</th>
                        <th scope="col" className="py-3 pr-4 text-right font-medium">{t('clientAnalyticsPage.details')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.reservations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-content-strong">
                            {t('common.noData')}
                          </td>
                        </tr>
                      ) : (
                        analytics.reservations.map((r) => (
                          <tr
                            key={r.id}
                            className="cursor-pointer border-b border-line hover:bg-surface-muted"
                            // 4.1.2: red je bio fokusabilan (tabIndex + onKeyDown) ali bez
                            // role koja kaže da je aktivabilan — AT najavi samo "red". Pristupačni
                            // put je dugme "Detalji" u zadnjoj koloni, isto kao u Reservations.tsx
                            // i Stylists.tsx, pa red ostaje klikabilan samo mišem (zgodna prečica).
                            onClick={(event) => openReservationDetail(r, event.currentTarget.querySelector('button'))}
                          >
                            <td data-label={t('clientAnalyticsPage.date')} className="py-3 pl-4 pr-3">{formatDateOnly(r.reservationDate)}</td>
                            <td data-label={t('clientAnalyticsPage.time')} className="py-3 pr-3">
                              {r.startTime} - {r.endTime}
                            </td>
                            <td data-label={t('clientAnalyticsPage.service')} className="py-3 pr-3">{r.service?.name ?? '-'}</td>
                            <td data-label={t('clientAnalyticsPage.stylist')} className="py-3 pr-3">{getStylistName(r.confirmedStylist)}</td>
                            <td data-label={t('clientAnalyticsPage.price')} className="py-3 pr-3 text-right tabular-nums">{formatLocalizedNumber(Number(r.service?.price ?? 0), i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td data-label={t('clientAnalyticsPage.status')} className="py-3 pr-3">
                              <Badge variant={statusBadgeVariant[r.status] ?? 'secondary'} className="text-[10px]">
                                {getReservationStatusLabel(r.status)}
                              </Badge>
                            </td>
                            <td data-label={t('clientAnalyticsPage.details')} className="py-3 pr-4 text-right">
                              <Button type="button" size="icon" variant="ghost" aria-label={t('clientAnalyticsPage.details')} onClick={(e) => {
                                e.stopPropagation()
                                openReservationDetail(r, e.currentTarget)
                              }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </AnalyticsTableRegion>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <Card className="overflow-hidden aurum-scroll-table-card">
                <AnalyticsTableRegion label={t('clientAnalyticsPage.manualEntriesCaption')}>
                  <table className="app-table data-table w-full border-collapse">
                    <caption className="sr-only">{t('clientAnalyticsPage.manualEntriesCaption')}</caption>
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                        <th scope="col" className="py-3 pl-4 pr-3 font-medium">{t('clientAnalyticsPage.date')}</th>
                        <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.service')}</th>
                        <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.stylist')}</th>
                        <th scope="col" className="py-3 pr-3 text-right font-medium">{t('clientAnalyticsPage.price')} (KM)</th>
                        <th scope="col" className="py-3 pr-3 text-right font-medium">{t('clientAnalyticsPage.tip')} (KM)</th>
                        <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.source')}</th>
                        <th scope="col" className="py-3 pr-4 font-medium">{t('clientAnalyticsPage.note')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.manualEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-content-strong">
                            {t('common.noData')}
                          </td>
                        </tr>
                      ) : (
                        analytics.manualEntries.map((e) => (
                          <tr key={e.id} className="border-b border-line">
                            <td data-label={t('clientAnalyticsPage.date')} className="py-3 pl-4 pr-3">{formatDateOnly(e.date)}</td>
                            <td data-label={t('clientAnalyticsPage.service')} className="py-3 pr-3">{e.service?.name ?? '-'}</td>
                            <td data-label={t('clientAnalyticsPage.stylist')} className="py-3 pr-3">{getStylistName(e.stylistProfile)}</td>
                            <td data-label={t('clientAnalyticsPage.price')} className="py-3 pr-3 text-right font-medium tabular-nums">{formatLocalizedNumber(Number(e.actualPrice), i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td data-label={t('clientAnalyticsPage.tip')} className="py-3 pr-3 text-right tabular-nums">{formatLocalizedNumber(Number(e.tipAmount), i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td data-label={t('clientAnalyticsPage.source')} className="py-3 pr-3">
                              <Badge variant={e.isManual ? 'brand' : 'secondary'} className="text-[10px]">
                                {e.isManual ? t('clientAnalyticsPage.manual') : t('clientAnalyticsPage.reservation')}
                              </Badge>
                            </td>
                            <td data-label={t('clientAnalyticsPage.note')} className="max-w-xs py-3 pr-4">
                              <p data-analytics-manual-note className="truncate text-xs text-content-strong ">{e.notes ?? '-'}</p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </AnalyticsTableRegion>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              {analytics.reviews.length === 0 ? (
                <p className="text-sm text-content-strong">{t('common.noData')}</p>
              ) : (
                <div className="space-y-3">
                  {analytics.reviews.map((r) => (
                    <Card
                      key={r.id}
                      className="relative cursor-pointer p-4 transition-shadow hover:shadow-md"
                    >
                      {/* 4.1.2: kartica je bila <div> s tabIndex + onKeyDown — tastatura je
                          radila, ali AT nije imao šta najaviti (Card renderuje običan <div>,
                          components/ui/card.tsx:7). Pravo <button> oko cijele kartice nije
                          izvodljivo jer <p> i <div> nisu dozvoljeni unutar <button>, a
                          role="button" bi progutao sadržaj (button ima prezentacijsku djecu).
                          Zato: naslov JE pravo dugme, a after:inset-0 ga razvlači preko cijele
                          kartice. Cijela površina ostaje klikabilna, sav sadržaj ostaje
                          čitljiv, a ime dugmeta sadrži vidljivi tekst (2.5.3). Fokus prsten
                          daje globalno pravilo globals.css:208. */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => openReviewDetail(r, event.currentTarget)}
                              aria-label={t('clientAnalyticsPage.reviewDetailsAction', {
                                service: r.service?.name ?? '-',
                              })}
                              className="cursor-pointer rounded text-left font-medium text-content after:absolute after:inset-0 after:content-['']"
                            >
                              {r.service?.name ?? '-'}
                            </button>
                            <Badge variant={r.isApproved ? 'success' : 'warning'} className="text-[10px]">
                              {r.isApproved ? t('clientAnalyticsPage.approved') : t('clientAnalyticsPage.pending')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-content-strong">{t('clientAnalyticsPage.service')}:</p>
                            <StarRating rating={r.serviceRating} />
                            {r.stylistRating != null ? (
                              <>
                                <p className="ml-2 text-xs text-content-strong">{t('clientAnalyticsPage.stylist')}:</p>
                                <StarRating rating={r.stylistRating} />
                              </>
                            ) : null}
                          </div>
                          {r.comment ? (
                            <p className="mt-2 line-clamp-2 text-sm text-content-strong ">{r.comment}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-xs text-content-strong">{formatInstantDate(r.createdAt)}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="debts" className="mt-4">
              <Card className="p-4">
                {debtsLoading ? (
                  <p className="text-sm text-content-strong">{t('clientAnalyticsPage.loading')}</p>
                ) : debtsError ? (
                  <div role="alert" className="space-y-3">
                    <p>{t('clientAnalyticsPage.debtsLoadError')}</p>
                    <Button type="button" variant="outline" onClick={() => setRetryVersion(value => value + 1)}>{t('common.retry')}</Button>
                  </div>
                ) : clientDebts.length === 0 ? (
                  <p className="text-sm text-content-strong">{t('common.noData')}</p>
                ) : (
                  <div className="grid gap-2">
                    {clientDebts.map((d) => {
                      const stylistName = d.stylistProfile?.user
                        ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim() || d.stylistProfile.user.username
                        : '—'
                      const ref =
                        d.reservation?.publicReferenceCode
                          ? t('clientAnalyticsPage.reservationReference', { code: d.reservation.publicReferenceCode })
                          : d.dailyLogEntry?.id
                            ? `${t('clientAnalyticsPage.dailyLog')}: ${formatDateOnly(d.dailyLogEntry.date)}`
                            : d.manualEntry?.id
                              ? `${t('clientAnalyticsPage.manualEntry')}: ${formatDateOnly(d.manualEntry.date)}`
                              : '—'
                      return (
                        <div
                          key={d.id}
                          className="rounded-md border border-line  p-3 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-content">
                              {d.service?.name ?? t('clientAnalyticsPage.debt')} · {formatLocalizedAmount(d.amount, i18n.language)}
                            </p>
                            <p className="text-xs text-content-strong ">
                              <span className="font-semibold">{t('clientAnalyticsPage.stylist')}:</span> {stylistName} · {ref}
                            </p>
                            <p className="text-xs text-content-strong mt-0.5">{formatInstantDate(d.createdAt)}</p>
                          </div>
                          <Badge variant={d.status === 'OPEN' ? 'warning' : 'success'} className="text-[10px]">
                            {d.status === 'OPEN' ? t('clientAnalyticsPage.open') : t('clientAnalyticsPage.closed')}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      <ClientAnalyticsDetailDialog detailOpen={detailOpen} closeDetail={closeDetail} detailTriggerRef={detailTriggerRef}
        detailReservation={detailReservation} detailReview={detailReview} formatDateOnly={formatDateOnly} formatInstantDate={formatInstantDate}
        getStylistName={getStylistName} getReservationStatusLabel={getReservationStatusLabel} statusBadgeVariant={statusBadgeVariant} />
    </div>
  )
}
