export interface PaginationInput {
  page?: number
  pageSize?: number
}

export interface NormalizedPagination {
  page: number
  pageSize: number
  skip: number
  take: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const normalizePagination = (
  input: PaginationInput | undefined,
  options?: { defaultPageSize?: number; maxPageSize?: number },
): NormalizedPagination | null => {
  const hasPagination = input?.page != null && input?.pageSize != null
  if (!hasPagination) return null
  const page = Math.max(0, input?.page ?? 0)
  const maxPageSize = Math.max(1, options?.maxPageSize ?? 100)
  const defaultPageSize = Math.max(1, options?.defaultPageSize ?? 10)
  const pageSizeRaw = input?.pageSize ?? defaultPageSize
  const pageSize = Math.min(maxPageSize, Math.max(1, pageSizeRaw))
  return { page, pageSize, skip: page * pageSize, take: pageSize }
}
