import { DEFAULT_BLOG_POST_LANGUAGE } from './blog-language'
import type { BlogPost, BlogPostFormValues } from './types'

export const emptyBlogPostForm = (): BlogPostFormValues => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  language: DEFAULT_BLOG_POST_LANGUAGE,
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
  // Stari zapisi (prije migracije) nemaju polje — default je jezik sajta.
  language: post.language || DEFAULT_BLOG_POST_LANGUAGE,
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
  // WCAG 3.1.2 — jezik članka, da ga javna stranica može izdati kao `lang`.
  language: form.language,
  isPublished: form.isPublished,
  noIndex: form.noIndex,
  slug: form.slug.trim() || undefined,
  excerpt: form.excerpt.trim() || null,
  heroImage: form.heroImage || null,
  ogImage: form.ogImage || null,
  seoTitle: form.seoTitle.trim() || null,
  seoDescription: form.seoDescription.trim() || null,
})
