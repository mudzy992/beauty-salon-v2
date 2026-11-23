import { useQuery } from '@tanstack/react-query'
import type { DefaultError, QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

/** Scope cached authenticated reads to a session, while preserving prefix invalidation. */
export function useSessionQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'placeholderData' | 'initialData' | 'queryKeyHashFn' | 'queryFn'> & { queryFn: () => Promise<TQueryFnData> }): UseQueryResult<TData, TError> {
  const sessionVersion = useAuthStore((state) => state.sessionVersion)
  return useQuery({
    ...options,
    // Existing query functions do not consume queryKey. Keep their prefix so
    // invalidateQueries still targets all matching session-scoped queries.
    queryKey: [...options.queryKey, { sessionVersion }] as unknown as TQueryKey,
    // Do not carry data or a hash function supplied by a caller across sessions.
    placeholderData: undefined,
    initialData: undefined,
    queryKeyHashFn: undefined,
  })
}
