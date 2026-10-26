import { getUploadUrl } from '../../utils/uploadUrl'
import { site } from '../../seo/site'
import { toExcerpt } from './blog-text'

export type PublicBlogPostSeoInput = {
  title: string
  slug: string
  content: string
  excerpt?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  heroImage?: string | null
  ogImage?: string | null
  noIndex?: boolean
  publishedAt?: string | null
  updatedAt?: string | null
}

export function buildPublicBlogPostSeo(
  post: PublicBlogPostSeoInput,
  fallbackDescription = 'Pročitajte članak na blogu Beauty Salon Nejra.',
) {
  const canonicalPath = `/blog/${post.slug}`
  const title = post.seoTitle?.trim() || post.title
  const description =
    post.seoDescription?.trim() ||
    post.excerpt?.trim() ||
    toExcerpt(post.content || '', 160) ||
    fallbackDescription
  const imagePath = post.ogImage || post.heroImage
  const ogImage = imagePath ? getUploadUrl(imagePath) : site.defaultOgImagePath
  const absImage = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : `${site.baseUrl}${ogImage}`
    : undefined
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    image: absImage,
    mainEntityOfPage: `${site.baseUrl}${canonicalPath}`,
    publisher: {
      '@type': 'Organization',
      name: site.siteName,
      url: site.baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${site.baseUrl}${site.defaultOgImagePath}`,
      },
    },
  }
  return { canonicalPath, title, description, ogImage, jsonLd, noindex: Boolean(post.noIndex) }
}
