import { useQuery } from '@tanstack/react-query'

import { fetchDailyLogEntry } from '../api/stylist-workbook.api'

export const useWorkbookEntry = (entryId: string) => {
  const query = useQuery({
    queryKey: ['dailyLog', 'entry', entryId],
    queryFn: () => fetchDailyLogEntry(entryId),
    enabled: !!entryId,
  })

  return {
    entry: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

