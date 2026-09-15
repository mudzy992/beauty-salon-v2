import type { BlogPost, BlogPostFormValues } from './types'

export const emptyBlogPostForm = (): BlogPostFormValues => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  heroImage: '',
  ogImage: '',
  seoTitle: '',
  seoDescription: '',
  isPublished: false,
  noIndex: false,
})

export const formFromPost = (post: BlogPost): BlogPostFormValues => ({
  title: post.title,
  slug: post.slug ?? '',
  excerpt: post.excerpt ?? '',
  content: post.content ?? '',
  heroImage: post.heroImage ?? '',
  ogImage: post.ogImage ?? '',
  seoTitle: post.seoTitle ?? '',
  seoDescription: post.seoDescription ?? '',
  isPublished: post.isPublished,
  noIndex: Boolean(post.noIndex),
})

export const toBlogPostPayload = (form: BlogPostFormValues) => ({
  title: form.title.trim(),
  content: form.content,
  isPublished: form.isPublished,
  noIndex: form.noIndex,
  slug: form.slug.trim() || undefined,
  excerpt: form.excerpt.trim() || null,
  heroImage: form.heroImage || null,
  ogImage: form.ogImage || null,
  seoTitle: form.seoTitle.trim() || null,
  seoDescription: form.seoDescription.trim() || null,
})
