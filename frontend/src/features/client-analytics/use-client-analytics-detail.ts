import { useRef, useState } from 'react'
import type { ClientAnalyticsData } from './client-analytics-types'

export function useClientAnalyticsDetail() {
  const detailTriggerRef = useRef<HTMLElement | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailReservation, setDetailReservation] = useState<ClientAnalyticsData['reservations'][0] | null>(null)
  const [detailReview, setDetailReview] = useState<ClientAnalyticsData['reviews'][0] | null>(null)

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

  return { detailTriggerRef, detailOpen, detailReservation, detailReview, openReservationDetail, openReviewDetail, closeDetail }
}
