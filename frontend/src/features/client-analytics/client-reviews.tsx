import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import { StarRating } from './star-rating'
import type { ClientAnalyticsData } from './client-analytics-types'
import type { DateFormatter } from './presentation-types'

type Props = {
  analytics: ClientAnalyticsData
  formatInstantDate: DateFormatter
  openReviewDetail: (review: ClientAnalyticsData['reviews'][number], trigger: HTMLElement) => void
}
export function ClientReviews({ analytics, formatInstantDate, openReviewDetail }: Props) {
  const { t } = useTranslation()
  return (
    <>
      {analytics.reviews.length === 0 ? (
        <p className="text-sm text-content-strong">{t('common.noData')}</p>
      ) : (
        <div className="space-y-3">
          {analytics.reviews.map((r, index) => (
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
                        service: r.service?.name ?? '-', date: formatInstantDate(r.createdAt), number: index + 1,
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
    </>
  )
}
