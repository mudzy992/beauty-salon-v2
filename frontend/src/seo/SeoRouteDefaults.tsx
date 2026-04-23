import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { Seo } from './Seo'
import { site } from './site'

const trimSlash = (path: string) => path.replace(/\/+$/, '') || '/'

const isNoIndexPath = (pathname: string): boolean => {
  if (pathname.startsWith('/admin')) return true
  if (pathname.startsWith('/stylist')) return true

  if (pathname === '/login') return true
  if (pathname === '/register') return true
  if (pathname.startsWith('/onboarding/')) return true
  if (pathname === '/force-change-password') return true

  if (pathname.startsWith('/moj-termin/')) return true
  if (pathname === '/profil') return true

  return false
}

const titleForPath = (pathname: string): string | null => {
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

const descriptionForPath = (pathname: string): string | null => {
  if (pathname === '/') return site.defaultDescription
  if (pathname === '/usluge') return 'Pregled usluga i ponude Beauty Salon Nejra.'
  if (pathname === '/blog') return 'Savjeti i novosti iz svijeta njege kose i beauty industrije.'
  if (pathname === '/galerija') return 'Pogledajte galeriju naših radova i transformacija.'
  if (pathname === '/kontakt') return 'Kontakt informacije, radno vrijeme i lokacija salona.'
  if (pathname === '/rezervacija') return 'Rezervišite termin online u Beauty Salon Nejra.'
  return null
}

export function SeoRouteDefaults() {
  const { pathname } = useLocation()

  const canonicalUrl = useMemo(() => trimSlash(pathname), [pathname])
  const noindex = useMemo(() => isNoIndexPath(pathname), [pathname])
  const title = useMemo(() => titleForPath(pathname), [pathname])
  const description = useMemo(() => descriptionForPath(pathname), [pathname])

  return (
    <Seo
      title={title ?? site.defaultTitle}
      description={description ?? site.defaultDescription}
      canonicalUrl={canonicalUrl}
      noindex={noindex}
      og={{
        type: pathname.startsWith('/blog/') ? 'article' : 'website',
        url: `${site.baseUrl}${canonicalUrl === '/' ? '/' : canonicalUrl}`,
      }}
    />
  )
}

