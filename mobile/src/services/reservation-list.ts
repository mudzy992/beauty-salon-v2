import api from './api'

const PAGE_SIZE = 50
const MAX_OFFSET = 1000
const MAX_ITEMS = MAX_OFFSET + PAGE_SIZE

type ReservationPage<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const fetchAllReservationPages = async <T = unknown>(
  filters: Record<string, string | boolean>,
): Promise<T[]> => {
  const items: T[] = []
  let total = Number.POSITIVE_INFINITY

  for (let page = 0; page <= Math.floor(MAX_OFFSET / PAGE_SIZE); page += 1) {
    const { data } = await api.get<unknown>('/api/reservations', {
      params: { ...filters, page, pageSize: PAGE_SIZE },
    })
    if (Array.isArray(data)) {
      if (data.length > MAX_ITEMS) {
        throw new Error('Reservation list exceeds the safe loading limit')
      }
      return data as T[]
    }
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray((data as ReservationPage<T>).items) ||
      (data as ReservationPage<T>).items.length > PAGE_SIZE ||
      !Number.isSafeInteger((data as ReservationPage<T>).total) ||
      (data as ReservationPage<T>).total < 0 ||
      (data as ReservationPage<T>).page !== page ||
      (data as ReservationPage<T>).pageSize !== PAGE_SIZE
    ) {
      throw new Error('Invalid reservation page response')
    }

    const response = data as ReservationPage<T>
    items.push(...response.items)
    total = response.total
    if (items.length >= total) return items
    if (page * PAGE_SIZE >= MAX_OFFSET) break
  }

  if (items.length < total) {
    throw new Error('Reservation list exceeds the safe loading limit')
  }
  return items
}
