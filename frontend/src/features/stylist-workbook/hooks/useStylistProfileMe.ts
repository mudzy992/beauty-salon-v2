import { useQuery } from '@tanstack/react-query'

import { fetchStylistProfileMe } from '../api/stylist-workbook.api'

export const useStylistProfileMe = () => {
  const query = useQuery({
    queryKey: ['stylistProfile', 'me'],
    queryFn: fetchStylistProfileMe,
  })

  return {
    profile: query.data ?? null,
    profileId: query.data?.id ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

