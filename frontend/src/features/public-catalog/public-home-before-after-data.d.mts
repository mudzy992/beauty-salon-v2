export type PublicHomeBeforeAfterPair = {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}

export function parsePublicHomeBeforeAfter(
  payload: unknown,
): PublicHomeBeforeAfterPair[] | null
