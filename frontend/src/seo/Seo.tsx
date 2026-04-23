import { Helmet } from 'react-helmet-async'

import { site, type SupportedLocale } from './site'

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

const absUrl = (urlOrPath: string): string => {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath
  const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`
  return `${site.baseUrl}${path}`
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
  const computedTitle = title ? site.titleTemplate.replace('%s', title) : site.defaultTitle
  const computedDescription = description ?? site.defaultDescription
  const computedLocale = (locale ?? site.defaultLocale) as SupportedLocale

  const canonical = canonicalUrl ? absUrl(canonicalUrl) : undefined

  const ogTitle = og?.title ?? computedTitle
  const ogDescription = og?.description ?? computedDescription
  const ogType = og?.type ?? 'website'
  const ogUrl = og?.url ?? canonical
  const ogImage = og?.image ? absUrl(og.image) : absUrl(site.defaultOgImagePath)
  const ogLocale = og?.locale ?? computedLocale

  const twCard = twitter?.card ?? site.twitter.card
  const twTitle = twitter?.title ?? ogTitle
  const twDescription = twitter?.description ?? ogDescription
  const twImage = twitter?.image ? absUrl(twitter.image) : ogImage

  const robots = noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large'

  return (
    <Helmet>
      <title>{computedTitle}</title>

      <meta name="description" content={computedDescription} />
      <meta name="robots" content={robots} />

      {canonical ? <link rel="canonical" href={canonical} /> : null}

      <meta property="og:site_name" content={site.siteName} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:type" content={ogType} />
      {ogUrl ? <meta property="og:url" content={ogUrl} /> : null}
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={ogLocale} />

      <meta name="twitter:card" content={twCard} />
      <meta name="twitter:title" content={twTitle} />
      <meta name="twitter:description" content={twDescription} />
      <meta name="twitter:image" content={twImage} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  )
}

