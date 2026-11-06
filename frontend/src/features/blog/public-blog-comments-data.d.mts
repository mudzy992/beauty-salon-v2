export type PublicBlogComment = {
  id: string
  content: string
  createdAt: string
  user: { firstName: string; lastName: string }
}

export type PublicBlogCommentsPage = {
  items: PublicBlogComment[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  nextOffset: number
}

export function parsePublicBlogComments(
  payload: unknown,
  requestedLimit: number,
  requestedOffset: number,
): PublicBlogCommentsPage | null
