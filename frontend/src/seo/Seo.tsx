import { Helmet } from 'react-helmet-async'

import { site, type SupportedLocale } from './site'
import { useSeoSettings } from './use-seo-settings'

type OpenGraph = {
  type?: 'website' | 'article'
  title?: string
  description?: string
  url?: string
  image?: string
  locale?: SupportedLocale
}

type Twitter = {
  card?: 'summary' | 'summary_large_image'
  title?: string
  description?: string
  image?: string
}

export type SeoProps = {
  title?: string
  description?: string
  canonicalUrl?: string
  noindex?: boolean
  locale?: SupportedLocale
  og?: OpenGraph
  twitter?: Twitter
  jsonLd?: unknown
}

export function Seo({
  title,
  description,
  canonicalUrl,
  noindex,
  locale,
  og,
  twitter,
  jsonLd,
}: SeoProps) {
  const seo = useSeoSettings()
  const absUrl = (urlOrPath: string): string => {
    if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath
    const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`
    return `${seo.base}${path}`
  }
  const pageTitle = title || seo.defaultTitle
  const computedTitle = title ? `${pageTitle} | ${seo.defaultTitle}` : seo.defaultTitle
  const computedDescription = description || seo.defaultDescription
  const computedLocale = (locale ?? site.defaultLocale) as SupportedLocale
  const canonical = canonicalUrl ? absUrl(canonicalUrl) : undefined
  const ogTitle = og?.title ?? computedTitle
  const ogDescription = og?.description ?? computedDescription
  const ogImage = og?.image ? absUrl(og.image) : absUrl(seo.ogImage)
  const robots = noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large'
  return (
    <Helmet>
      <title>{computedTitle}</title>
      <meta name="description" content={computedDescription} />
      <meta name="robots" content={robots} />
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      <meta property="og:site_name" content={seo.defaultTitle} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:type" content={og?.type ?? 'website'} />
      {(og?.url ?? canonical) ? <meta property="og:url" content={og?.url ?? canonical} /> : null}
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={og?.locale ?? computedLocale} />
      <meta name="twitter:card" content={twitter?.card ?? site.twitter.card} />
      <meta name="twitter:title" content={twitter?.title ?? ogTitle} />
      <meta name="twitter:description" content={twitter?.description ?? ogDescription} />
      <meta name="twitter:image" content={twitter?.image ? absUrl(twitter.image) : ogImage} />
      {jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}
    </Helmet>
  )
}
