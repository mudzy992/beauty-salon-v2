import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { Seo } from './Seo'
import { useSeoSettings } from './use-seo-settings'

const trimSlash = (path: string) => path.replace(/\/+$/, '') || '/'

const isNoIndexPath = (pathname: string): boolean => {
  if (pathname.startsWith('/admin') || pathname.startsWith('/stylist')) return true
  if (pathname === '/login' || pathname === '/register') return true
  if (pathname.startsWith('/onboarding/') || pathname === '/force-change-password') return true
  if (pathname.startsWith('/moj-termin/') || pathname === '/profil') return true
  return false
}

const fallbackTitle = (pathname: string): string | null => {
  if (pathname === '/') return 'Početna'
  if (pathname === '/usluge') return 'Usluge'
  if (pathname === '/blog') return 'Blog'
  if (pathname === '/galerija') return 'Galerija'
  if (pathname === '/kontakt') return 'Kontakt'
  if (pathname === '/rezervacija') return 'Rezervacija'
  if (pathname === '/zadovoljni-klijenti') return 'Zadovoljni klijenti'
  if (pathname === '/login') return 'Prijava'
  if (pathname === '/register') return 'Registracija'
  return null
}

export function SeoRouteDefaults() {
  const { pathname } = useLocation()
  const seo = useSeoSettings()
  const canonicalUrl = useMemo(() => trimSlash(pathname), [pathname])
  const noindex = useMemo(() => isNoIndexPath(pathname), [pathname])
  const page = seo.forPath(canonicalUrl)
  const title = page.title || fallbackTitle(pathname)
  const description = page.description || (canonicalUrl === '/' ? seo.defaultDescription : null)
  return (
    <Seo
      title={title ?? seo.defaultTitle}
      description={description ?? seo.defaultDescription}
      canonicalUrl={canonicalUrl}
      noindex={noindex}
      og={{
        type: pathname.startsWith('/blog/') ? 'article' : 'website',
        url: `${seo.base}${canonicalUrl === '/' ? '/' : canonicalUrl}`,
      }}
    />
  )
}
