export interface BlogComment {
  id: string
  content: string
  isApproved: boolean
  createdAt: string
  user?: { username: string; firstName: string | null; lastName: string | null }
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  /** WCAG 3.1.2 — jezik članka; izdaje se kao `lang` na naslovu i sadržaju. */
  language: string
  heroImage: string | null
  ogImage: string | null
  seoTitle: string | null
  seoDescription: string | null
  noIndex: boolean
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt?: string
  commentsTotalCount?: number
  commentsPendingCount?: number
}

export type BlogPostFormValues = {
  title: string
  slug: string
  excerpt: string
  content: string
  language: string
  heroImage: string
  ogImage: string
  seoTitle: string
  seoDescription: string
  isPublished: boolean
  noIndex: boolean
}
