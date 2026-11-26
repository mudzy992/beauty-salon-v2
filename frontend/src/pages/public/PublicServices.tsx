import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Clock3, Search, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'

import {
  fetchAllPublicServiceCategories,
  fetchAllPublicServices,
  fetchAllPublicServiceSubcategories,
} from '../../api/catalog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useSettings } from '../../context/SettingsContext'
import { cssBackgroundImage } from '../../constants/media-fallback'
import { publicAurum } from '../../features/shell/public/public-ui'
import { useTheme } from '../../features/shell/theme/theme-context'
import { FilterBar } from '../../features/shell/aurum/ui/filter-bar'
import { EmptyState, ErrorState, TableSkeleton } from '../../features/shell/aurum/ui/data-state'

interface ServiceOption {
  id: string
  subcategoryId: string
  name: string
  durationMinutes: number
}

interface ServiceSubcategory {
  id: string
  categoryId: string
  name: string
  services?: ServiceOption[]
}

interface ServiceCategory {
  id: string
  name: string
  subcategories?: ServiceSubcategory[]
}

interface CatalogService extends ServiceOption {
  subcategory?: { categoryId: string }
}

interface PublicSalonIdentity {
  name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
}

const ALL_CATEGORIES = 'all'

const categoryTones = [
  { icon: 'bg-surface-muted text-brand-rose-text', glow: 'bg-surface-muted/70' },
  { icon: 'bg-surface-muted text-content-strong', glow: 'bg-surface-muted/70' },
  { icon: 'bg-surface-muted text-brand-rose-text', glow: 'bg-surface-muted/70' },
  { icon: 'bg-surface-muted text-brand-rose-text', glow: 'bg-surface-muted/70' },
]

const getServiceCount = (category: ServiceCategory) =>
  (category.subcategories ?? []).reduce((total, subcategory) => total + (subcategory.services?.length ?? 0), 0)

export default function PublicServices() {
  const { t, i18n } = useTranslation()
  const { getSetting } = useSettings()
  const { skin } = useTheme()
  const isAurum = skin === 'aurum'
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [salon, setSalon] = useState<PublicSalonIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORIES)
  const requestIdRef = useRef(0)

  const loadCategories = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const [categoryList, subcategoryList, serviceList] = await Promise.all([
        fetchAllPublicServiceCategories<ServiceCategory>({ activeOnly: true }),
        fetchAllPublicServiceSubcategories<ServiceSubcategory>({ activeOnly: true }),
        fetchAllPublicServices<CatalogService>({ activeOnly: true }),
      ])
      if (!Array.isArray(categoryList) || !Array.isArray(subcategoryList) || !Array.isArray(serviceList)) {
        throw new Error('Invalid public service catalogue response')
      }
      const servicesBySubcategory = new Map<string, ServiceOption[]>()
      serviceList.forEach((service) => {
        const services = servicesBySubcategory.get(service.subcategoryId) ?? []
        services.push(service)
        servicesBySubcategory.set(service.subcategoryId, services)
      })
      const subcategoriesByCategory = new Map<string, ServiceSubcategory[]>()
      subcategoryList.forEach((subcategory) => {
        const subcategories = subcategoriesByCategory.get(subcategory.categoryId) ?? []
        subcategories.push({
          ...subcategory,
          services: servicesBySubcategory.get(subcategory.id) ?? [],
        })
        subcategoriesByCategory.set(subcategory.categoryId, subcategories)
      })
      if (requestId === requestIdRef.current) {
        setCategories(
          categoryList.map((category) => ({
            ...category,
            subcategories: subcategoriesByCategory.get(category.id) ?? [],
          })),
        )
      }
    } catch {
      if (requestId === requestIdRef.current) setLoadError(true)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
    return () => {
      requestIdRef.current += 1
    }
  }, [loadCategories])

  useEffect(() => {
    let active = true
    api.get<PublicSalonIdentity | null>('/api/salon')
      .then(({ data }) => {
        if (active) setSalon(data)
      })
      .catch(() => {
        if (active) setSalon(null)
      })
    return () => {
      active = false
    }
  }, [])

  const filteredCategories = useMemo(() => {
    const cleanQuery = query.trim().toLocaleLowerCase(i18n.resolvedLanguage || i18n.language)
    return categories
      .filter((category) => activeCategoryId === ALL_CATEGORIES || category.id === activeCategoryId)
      .map((category) => ({
        ...category,
        subcategories: (category.subcategories ?? [])
          .map((subcategory) => ({
            ...subcategory,
            services: (subcategory.services ?? []).filter((service) => {
              if (!cleanQuery) return true
              return [service.name, subcategory.name, category.name].some((value) =>
                value.toLocaleLowerCase(i18n.resolvedLanguage || i18n.language).includes(cleanQuery),
              )
            }),
          }))
          .filter((subcategory) => !cleanQuery || (subcategory.services?.length ?? 0) > 0),
      }))
      .filter((category) => !cleanQuery || (category.subcategories?.length ?? 0) > 0)
  }, [activeCategoryId, categories, i18n.language, i18n.resolvedLanguage, query])

  const totalServiceCount = useMemo(
    () => categories.reduce((total, category) => total + getServiceCount(category), 0),
    [categories],
  )
  const visibleServiceCount = useMemo(
    () => filteredCategories.reduce((total, category) => total + getServiceCount(category), 0),
    [filteredCategories],
  )
  const hasFilters = query.trim().length > 0 || activeCategoryId !== ALL_CATEGORIES
  const servicesHeroBg = getSetting('public_services_bg', '').trim()
  const heroBackgroundImage = servicesHeroBg ? cssBackgroundImage(servicesHeroBg) : undefined
  const salonName = salon?.name?.trim() || ''
  const salonAddress = getSetting('public_contact_address', '').trim() || salon?.address?.trim() || ''
  const salonPhone = getSetting('public_contact_phone', '').trim() || salon?.phone?.trim() || ''
  const salonEmail = getSetting('public_contact_email', '').trim() || salon?.email?.trim() || ''
  const salonIdentity = [salonName, salonAddress].filter(Boolean).join(' · ')
  const editorial = (key: string) => getSetting(`public_services_${key}`, '').trim()
  const serviceTitle = editorial('title') || salonName || t('public.nav.services')
  const serviceSubtitle = editorial('subtitle')
  const serviceSteps = [1, 2, 3].map((number) => ({
    number,
    title: editorial(`step_${number}_title`),
    description: editorial(`step_${number}_description`),
  })).filter((step) => step.title || step.description)
  const hasCtaContent = Boolean(
    editorial('cta_eyebrow') || editorial('cta_heading') || editorial('cta_description') || editorial('cta_button'),
  )

  const clearFilters = () => {
    setQuery('')
    setActiveCategoryId(ALL_CATEGORIES)
  }

  /* Ista polja u oba prikazna režima: nema duplih id-jeva ni kontrola. */
  const filterFields = (
              <div className="grid gap-5 lg:grid-cols-[minmax(16rem,0.8fr)_1.2fr] lg:items-end">
                <div>
                  <label htmlFor="public-services-search" className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-content-strong">
                    {t('public.servicesPage.searchLabel')}
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-content-strong" aria-hidden="true" />
                    <Input
                      id="public-services-search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t('public.servicesPage.searchPlaceholder')}
                      className="h-12 rounded-full border-line bg-surface pl-11 pr-14 text-content placeholder:text-content-muted focus-visible:ring-focus-ring"
                    />
                    {query ? (
                      <button
                        type="button"
                        aria-label={t('public.servicesPage.clearSearch')}
                        onClick={() => setQuery('')}
                        className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-content-strong transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <fieldset data-service-category-filter className="min-w-0">
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-content-strong">
                    {t('public.servicesPage.categoryFilter')}
                  </legend>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                      type="button"
                      aria-pressed={activeCategoryId === ALL_CATEGORIES}
                      onClick={() => setActiveCategoryId(ALL_CATEGORIES)}
                      className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${activeCategoryId === ALL_CATEGORIES ? 'border-surface-inverse bg-surface-inverse text-on-surface-inverse' : 'border-line bg-surface text-content-strong hover:border-control-border hover:bg-surface-muted'}`}
                    >
                      {t('public.servicesPage.allCategories')}
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={activeCategoryId === category.id}
                        onClick={() => setActiveCategoryId(category.id)}
                        className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${activeCategoryId === category.id ? 'border-surface-inverse bg-surface-inverse text-on-surface-inverse' : 'border-line bg-surface text-content-strong hover:border-control-border hover:bg-surface-muted'}`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
  )

  return (
    <div data-aurum-page="services" data-aurum-tokens={publicAurum.page} className={`min-h-screen overflow-hidden bg-surface pb-20 text-content ${isAurum ? publicAurum.page : ''}`}>
      <section className="relative isolate overflow-hidden border-b border-line bg-surface-sunken">
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-44 h-[34rem] w-[34rem] rounded-full border border-line" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-[26rem] w-[26rem] rounded-full border border-line" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1fr_0.92fr] lg:gap-14 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="relative z-10 max-w-2xl">
            {salonIdentity ? (
              <div data-service-identity className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand-rose-text shadow-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{salonIdentity}</span>
              </div>
            ) : null}
            <h1 className={`max-w-xl text-5xl font-medium leading-[0.98] tracking-[-0.055em] text-content sm:text-6xl lg:text-[4.5rem] ${isAurum ? publicAurum.heading : ''}`}>
              {serviceTitle}
            </h1>
            {serviceSubtitle ? (
              <p className="mt-6 max-w-xl text-base leading-7 text-content-strong sm:text-lg sm:leading-8">{serviceSubtitle}</p>
            ) : null}
            {editorial('hero_note') ? (
              <p className="mt-4 max-w-lg text-sm leading-6 text-content-strong">{editorial('hero_note')}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#service-catalog"
                className="inline-flex h-12 items-center gap-3 rounded-full bg-surface-inverse px-6 text-sm font-semibold text-on-surface-inverse shadow-lg transition hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              >
                {editorial('hero_explore_cta') || t('public.servicesPage.exploreServices')}
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <Button
                asChild
                variant="outline"
                className="h-12 border-line bg-surface/60 px-6 text-content hover:bg-surface"
              >
                <Link to="/rezervacija">{editorial('hero_book_cta') || t('public.servicesPage.bookAppointment')}</Link>
              </Button>
            </div>
            {editorial('hero_footnote') ? (
              <div className="mt-10 flex items-center gap-3 text-xs font-medium tracking-wide text-content-strong">
                <span className="h-px w-10 bg-line" />
                <span>{editorial('hero_footnote')}</span>
              </div>
            ) : null}
          </div>

          <div className="relative mx-auto w-full max-w-[36rem] lg:ml-auto lg:max-w-none">
            <div aria-hidden="true" className="absolute -right-4 -top-4 h-28 w-28 rounded-full border border-line sm:-right-7 sm:-top-7 sm:h-40 sm:w-40" />
            <div className="relative min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-white/70 bg-surface-muted shadow-[0_28px_80px_-35px_rgba(63,42,32,0.5)] sm:min-h-[28rem] lg:min-h-[34rem]">
              <div
                aria-hidden="true"
                className={`absolute inset-0 bg-cover bg-center ${heroBackgroundImage ? '' : 'bg-gradient-to-br from-[#c6aa96] via-[#e6d8ca] to-[#8e7060]'}`}
                style={heroBackgroundImage ? { backgroundImage: heroBackgroundImage } : undefined}
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#241814]/75 via-[#241814]/5 to-[#241814]/5" />
              <div className="relative flex min-h-[22rem] flex-col justify-between p-5 pb-24 sm:min-h-[28rem] sm:p-7 sm:pb-20 lg:min-h-[34rem] lg:pb-16">
                <div className="flex items-start justify-between gap-4">
                  {editorial('image_badge') ? (
                    /* Bijeli badge — tekst fiksno taman u SVIM temama (površina je uvijek bijela). */
                    <span data-service-image-badge className="rounded-full border border-white/40 bg-white/85 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#554038] shadow-sm backdrop-blur">
                      {editorial('image_badge')}
                    </span>
                  ) : <span />}
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/25 text-white backdrop-blur-md">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <div data-service-image-caption className="max-w-sm text-white">
                  <div className="mb-3 h-px w-12 bg-white/70" />
                  {editorial('image_caption') ? (
                    <p className="text-2xl font-medium leading-tight tracking-[-0.03em] sm:text-3xl">{editorial('image_caption')}</p>
                  ) : null}
                  {editorial('image_subcaption') ? (
                    <p className="mt-3 text-sm leading-6 text-white/80">{editorial('image_subcaption')}</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div data-aurum-service-count className="absolute -bottom-5 right-4 z-10 inline-flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-xl sm:right-8 sm:max-w-[calc(100%-4rem)] sm:px-5 sm:py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-brand-rose-text">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                {editorial('catalog_size_label') ? (
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-content-strong">
                    {editorial('catalog_size_label')}
                  </span>
                ) : null}
                <span className="mt-0.5 block text-sm font-semibold text-content">
                  {t('public.servicesPage.serviceCount', { count: totalServiceCount })}
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {serviceSteps.length > 0 ? (
        <section className="relative z-10 mx-auto -mt-1 max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div data-service-steps className="grid overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-[0_16px_50px_-32px_rgba(70,46,35,0.38)] sm:grid-cols-3">
            {serviceSteps.map((step, index) => (
              <div key={step.number} className={`flex items-start gap-4 px-5 py-5 sm:px-6 sm:py-6 ${index < serviceSteps.length - 1 ? 'border-b border-line sm:border-b-0 sm:border-r' : ''}`}>
                <span data-service-step-number className="mt-0.5 shrink-0 whitespace-nowrap text-xs font-semibold tracking-[0.18em] text-brand-rose-text">0{step.number}</span>
                <span>
                  {step.title ? <span className="block text-sm font-semibold text-content">{step.title}</span> : null}
                  {step.description ? <span className="mt-1 block text-xs leading-5 text-content-strong">{step.description}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section id="service-catalog" className="mx-auto max-w-7xl scroll-mt-8 px-4 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            {editorial('catalog_eyebrow') ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-rose-text">{editorial('catalog_eyebrow')}</p> : null}
            {editorial('catalog_heading') ? (
              <h2 className="mt-3 text-3xl font-medium leading-tight tracking-[-0.04em] text-content sm:text-4xl">{editorial('catalog_heading')}</h2>
            ) : (
              <h2 className="sr-only">{t('public.nav.services')}</h2>
            )}
            {editorial('catalog_description') ? <p className="mt-3 max-w-xl text-sm leading-6 text-content-strong sm:text-base">{editorial('catalog_description')}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm text-content-strong">
            <span data-service-catalog-icon className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-brand-rose-text">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{t('public.servicesPage.serviceCount', { count: visibleServiceCount })}</span>
          </div>
        </div>

        {loading ? (
          isAurum ? (
            <TableSkeleton rows={2} columns={2} />
          ) : (
            <div role="status" aria-live="polite" className="space-y-5">
              <p className="text-sm text-content-strong">{t('public.servicesPage.loading')}</p>
              <div className="grid gap-5 xl:grid-cols-2">
                {[0, 1].map((item) => (
                  <div key={item} aria-hidden="true" className="h-72 animate-pulse rounded-[1.5rem] border border-line bg-surface" />
                ))}
              </div>
            </div>
          )
        ) : loadError ? (
          isAurum ? (
            <ErrorState
              title={t('public.servicesPage.loadFailed')}
              onRetry={() => void loadCategories()}
            />
          ) : (
            <div role="alert" className="rounded-[1.5rem] border border-line bg-surface px-6 py-12 text-center shadow-sm">
              <p className="text-content-strong">{t('public.servicesPage.loadFailed')}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-5 border-line text-content"
                onClick={() => void loadCategories()}
              >
                {t('public.servicesPage.retry')}
              </Button>
            </div>
          )
        ) : categories.length === 0 ? (
          isAurum ? (
            <EmptyState
              title={t('public.servicesPage.emptyCatalog')}
              action={
                <Button type="button" variant="outline" onClick={clearFilters}>
                  {t('public.servicesPage.clearFilters')}
                </Button>
              }
            />
          ) : (
            <div role="status" className="rounded-[1.5rem] border border-line bg-surface px-6 py-14 text-center text-content-strong">
              {t('public.servicesPage.emptyCatalog')}
            </div>
          )
        ) : (
          <>
            {isAurum ? (
              <FilterBar
                showSubmit={false}
                onReset={hasFilters ? clearFilters : undefined}
                resultSummary={t('public.servicesPage.serviceCount', { count: visibleServiceCount })}
                className="mb-7 rounded-[1.5rem] border border-line bg-surface p-4 shadow-[0_12px_36px_-30px_rgba(70,46,35,0.45)] sm:p-5"
              >
                {filterFields}
              </FilterBar>
            ) : (
              <div className="mb-7 rounded-[1.5rem] border border-line bg-surface p-4 shadow-[0_12px_36px_-30px_rgba(70,46,35,0.45)] sm:p-5">
                {filterFields}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-content-strong">
                  <span aria-live="polite" aria-atomic="true">
                    {t('public.servicesPage.serviceCount', { count: visibleServiceCount })}
                  </span>
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1.5 font-semibold text-brand-rose-text underline decoration-line underline-offset-4 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      {t('public.servicesPage.clearFilters')}
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {filteredCategories.length === 0 ? (
              isAurum ? (
                <EmptyState
                  title={t('public.servicesPage.noResultsTitle')}
                  description={t('public.servicesPage.noResultsDescription')}
                  action={
                    <Button type="button" variant="outline" onClick={clearFilters}>
                      {t('public.servicesPage.clearFilters')}
                    </Button>
                  }
                />
              ) : (
                <div role="status" className="rounded-[1.5rem] border border-line bg-surface px-6 py-14 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-brand-rose-text">
                    <Search className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-content">
                    {t('public.servicesPage.noResultsTitle')}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-content-strong">
                    {t('public.servicesPage.noResultsDescription')}
                  </p>
                  <Button type="button" variant="outline" className="mt-5 border-line text-content" onClick={clearFilters}>
                    {t('public.servicesPage.clearFilters')}
                  </Button>
                </div>
              )
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {filteredCategories.map((category, categoryIndex) => {
                  const tone = categoryTones[categoryIndex % categoryTones.length]
                  const categoryServiceCount = getServiceCount(category)
                  return (
                    <article
                      key={category.id}
                      className="group relative isolate overflow-hidden rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_18px_50px_-38px_rgba(70,46,35,0.46)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-38px_rgba(70,46,35,0.55)] sm:p-7"
                    >
                      <div aria-hidden="true" className={`pointer-events-none absolute -right-14 -top-16 -z-10 h-48 w-48 rounded-full blur-2xl ${tone.glow}`} />
                      <header className="flex items-start justify-between gap-4 border-b border-line pb-5">
                        <div className="flex min-w-0 items-center gap-4">
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
                            <Sparkles className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-content-strong">
                              {t('public.servicesPage.categoryLabel', { number: String(categoryIndex + 1).padStart(2, '0') })}
                            </span>
                            <h3 className="mt-1 break-words text-xl font-semibold tracking-[-0.03em] text-content sm:text-2xl">
                              {category.name}
                            </h3>
                          </span>
                        </div>
                        <span data-service-category-count className="shrink-0 pt-1 text-right text-[0.68rem] font-medium text-content-strong">
                          {t('public.servicesPage.serviceCount', { count: categoryServiceCount })}
                        </span>
                      </header>

                      <div className="mt-5 space-y-6">
                        {category.subcategories?.length ? (
                          category.subcategories.map((subcategory) => (
                            <section key={subcategory.id} aria-label={subcategory.name}>
                              <h4 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-content-strong">
                                {subcategory.name}
                              </h4>
                              {subcategory.services?.length ? (
                                <ul className="divide-y divide-line">
                                  {subcategory.services.map((service) => (
                                    <li key={service.id}>
                                      <Link
                                        to={`/usluge/${service.id}`}
                                        data-service-link
                                        className="group/service flex min-h-[4.25rem] items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
                                      >
                                        <span className="min-w-0 flex-1">
                                          <span className="block font-medium text-content transition group-hover/service:text-brand-rose-text">
                                            {service.name}
                                          </span>
                                          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-content-strong">
                                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                            {t('public.servicesPage.duration', { minutes: service.durationMinutes })}
                                          </span>
                                        </span>
                                        <span data-service-arrow className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-content-strong transition group-hover/service:border-control-border group-hover/service:bg-surface-muted">
                                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="rounded-xl bg-surface px-3 py-3 text-sm text-content-strong">
                                  {t('common.noData')}
                                </p>
                              )}
                            </section>
                          ))
                        ) : (
                          <p role="status" className="rounded-xl bg-surface px-3 py-4 text-sm text-content-strong">
                            {t('common.noData')}
                          </p>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>

      {!loading && !loadError && (hasCtaContent || salonAddress || salonPhone || salonEmail) ? (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-surface-inverse px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 -z-10 h-80 w-80 rounded-full border border-white/15" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-14 -z-10 h-60 w-60 rounded-full border border-white/10" />
            <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                {editorial('cta_eyebrow') ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-inverse">{editorial('cta_eyebrow')}</p> : null}
                {editorial('cta_heading') ? <h2 className="mt-3 text-2xl font-medium leading-tight tracking-[-0.035em] sm:text-3xl">{editorial('cta_heading')}</h2> : null}
                {editorial('cta_description') ? <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{editorial('cta_description')}</p> : null}
                {(salonAddress || salonPhone || salonEmail) ? (
                  <address className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs not-italic text-white/75">
                    {salonAddress ? <span>{salonAddress}</span> : null}
                    {salonPhone ? <a className="underline underline-offset-4" href={`tel:${salonPhone}`}>{salonPhone}</a> : null}
                    {salonEmail ? <a className="underline underline-offset-4" href={`mailto:${salonEmail}`}>{salonEmail}</a> : null}
                  </address>
                ) : null}
              </div>
              <Button asChild variant="onDark" size="lg" className="shrink-0 gap-2 px-6">
                <Link to="/rezervacija">
                  {editorial('cta_button') || editorial('hero_book_cta') || t('public.servicesPage.bookAppointment')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
