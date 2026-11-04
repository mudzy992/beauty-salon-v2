import api from './client'

export interface DailyLogClientOption {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  gender: 'MALE' | 'FEMALE' | null
}

export interface DailyLogClientPage {
  items: DailyLogClientOption[]
  total: number
  page: number
  pageSize: number
}

export const fetchDailyLogClients = async (options: {
  q?: string
  page?: number
  pageSize?: number
  clientId?: string
} = {}): Promise<DailyLogClientPage> => {
  const { data } = await api.get<unknown>('/api/users/for-daily-log', {
    params: options.clientId
      ? { clientId: options.clientId }
      : {
          page: options.page ?? 0,
          pageSize: options.pageSize ?? 50,
          q: options.q?.trim() || undefined,
        },
  })

  if (Array.isArray(data)) {
    return {
      items: data as DailyLogClientOption[],
      total: data.length,
      page: 0,
      pageSize: Math.max(data.length, 1),
    }
  }
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as DailyLogClientPage).items)
  ) {
    throw new Error('Invalid daily-log client picker response')
  }
  return data as DailyLogClientPage
}
