export type PublicBlogListPost = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  /** WCAG 3.1.2 — jezik članka. Opciono: stariji keširani odgovori ga nemaju. */
  language?: string | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  heroImage?: string | null
}

export type PublicBlogListPage = {
  items: PublicBlogListPost[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
  nextOffset: number
}

export function parsePublicBlogListPage(
  payload: unknown,
  requestedLimit: number,
  requestedOffset: number,
): PublicBlogListPage | null
