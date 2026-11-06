export type PublicBlogPost = {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  heroImage?: string | null
  ogImage?: string | null
  noIndex?: boolean
  publishedAt: string | null
  updatedAt?: string | null
}

export function parsePublicBlogPost(
  payload: unknown,
  requestedSlug: string,
): PublicBlogPost | null
