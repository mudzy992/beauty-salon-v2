export type PublicSatisfiedClientsPair = {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}

export type PublicSatisfiedClientsPage = {
  items: PublicSatisfiedClientsPair[]
  hasMore: boolean
  nextOffset: number
}

export function parsePublicSatisfiedClientsPage(
  payload: unknown,
  requestedLimit: number,
  requestedOffset: number,
): PublicSatisfiedClientsPage | null
