import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../features/shell/admin/ui/page-header'
import {
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { useClientAnalyticsData } from '../features/client-analytics/use-client-analytics-data'
import { useClientAnalyticsDetail } from '../features/client-analytics/use-client-analytics-detail'
import { useClientAnalyticsPresentation } from '../features/client-analytics/use-client-analytics-presentation'
import { statusBadgeVariant } from '../features/client-analytics/reservation-status'
import { ClientPeriodFilter } from '../features/client-analytics/client-period-filter'
import { ClientAnalyticsDetailDialog } from '../features/client-analytics/client-analytics-detail-dialog'
import { ClientAnalyticsSummary } from '../features/client-analytics/client-analytics-summary'
import { ClientReservationsTable } from '../features/client-analytics/client-reservations-table'
import { ClientManualEntriesTable } from '../features/client-analytics/client-manual-entries-table'
import { ClientReviews } from '../features/client-analytics/client-reviews'
import { ClientDebts } from '../features/client-analytics/client-debts'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

export default function ClientAnalytics() {
  const { t, formatDateOnly, formatInstantDate, getReservationStatusLabel, getStylistName, getUserName } = useClientAnalyticsPresentation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedUserId = searchParams.get('userId')
  const appliedFrom = searchParams.get('fromDate') ?? ''
  const appliedTo = searchParams.get('toDate') ?? ''
  const { detailTriggerRef, detailOpen, detailReservation, detailReview,
    openReservationDetail, openReviewDetail, closeDetail } = useClientAnalyticsDetail()
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

      <ClientPeriodFilter analytics={analytics} dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo}
        applyDateFilter={applyDateFilter} clearDateFilter={clearDateFilter} formatDateOnly={formatDateOnly} />

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
          <ClientAnalyticsSummary analytics={analytics} getUserName={getUserName} formatInstantDate={formatInstantDate} />

          <Tabs defaultValue="reservations">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
              <TabsTrigger value="reservations">{t('clientAnalyticsPage.tabs.reservations')} ({analytics.reservations.length})</TabsTrigger>
              <TabsTrigger value="manual">{t('clientAnalyticsPage.tabs.manualEntries')} ({analytics.manualEntries.length})</TabsTrigger>
              <TabsTrigger value="debts">{t('clientAnalyticsPage.tabs.debts')}{!debtsLoading && !debtsError ? ` (${clientDebts.length})` : ''}</TabsTrigger>
              <TabsTrigger value="reviews">{t('clientAnalyticsPage.tabs.reviews')} ({analytics.reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="reservations" className="mt-4">
              <ClientReservationsTable analytics={analytics} formatDateOnly={formatDateOnly} getStylistName={getStylistName} getReservationStatusLabel={getReservationStatusLabel} statusBadgeVariant={statusBadgeVariant} openReservationDetail={openReservationDetail} />
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <ClientManualEntriesTable analytics={analytics} formatDateOnly={formatDateOnly} getStylistName={getStylistName} />
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              <ClientReviews analytics={analytics} formatInstantDate={formatInstantDate} openReviewDetail={openReviewDetail} />
            </TabsContent>

            <TabsContent value="debts" className="mt-4">
              <ClientDebts clientDebts={clientDebts} debtsLoading={debtsLoading} debtsError={debtsError} formatDateOnly={formatDateOnly} formatInstantDate={formatInstantDate} setRetryVersion={setRetryVersion} />
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
