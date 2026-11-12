import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, CheckCircle2, Clock, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { BeforeAfterSpotlight } from '../../features/shell/public/before-after-spotlight'
import { publicHeader, publicPage, publicSection } from '../../features/shell/public/public-ui'
import { isPublicFeatureOn } from '../../features/shell/public/public-features'
import { useSettings } from '../../context/SettingsContext'
import { MediaImage } from '../../components/media-image'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { cssBackgroundImage, resolveRemoteMediaUrl } from '../../constants/media-fallback'
import { getUploadUrl } from '../../utils/uploadUrl'
import { parsePublicHomeBeforeAfter } from '../../features/public-catalog/public-home-before-after-data.mjs'
import {
  parsePublicHomeFeaturedReview,
  type PublicHomeFeaturedReview,
} from '../../features/public-catalog/public-home-featured-review-data.mjs'

const MotionDiv = motion.div

interface BeforeAfterPair {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}

const getImageUrl = (path: string): string =>
  path.startsWith('http') ? path : getUploadUrl(path)

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
}

export default function PublicHome() {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const reviewsOn = isPublicFeatureOn(getSetting, 'public_feature_reviews')
  const [beforeAfterPairs, setBeforeAfterPairs] = useState<BeforeAfterPair[]>([])
  const [beforeAfterLoading, setBeforeAfterLoading] = useState(true)
  const [beforeAfterLoadError, setBeforeAfterLoadError] = useState(false)
  const [featuredReview, setFeaturedReview] = useState<PublicHomeFeaturedReview | null>(null)
  const [featuredReviewLoading, setFeaturedReviewLoading] = useState(true)
  const [featuredReviewLoadError, setFeaturedReviewLoadError] = useState(false)

  const beforeAfterRequestGeneration = useRef(0)
  const loadBeforeAfter = useCallback(async () => {
    const generation = ++beforeAfterRequestGeneration.current
    setBeforeAfterLoading(true)
    setBeforeAfterLoadError(false)
    try {
      const { data } = await api.get<unknown>(
        '/api/daily-log/before-after',
        { params: { limit: 6, random: 1 } },
      )
      const items = parsePublicHomeBeforeAfter(data)
      if (generation !== beforeAfterRequestGeneration.current) return
      if (!items) throw new Error('Invalid public before/after response')
      setBeforeAfterPairs(items)
    } catch {
      if (generation !== beforeAfterRequestGeneration.current) return
      setBeforeAfterLoadError(true)
    } finally {
      if (generation === beforeAfterRequestGeneration.current) {
        setBeforeAfterLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadBeforeAfter()
    return () => {
      beforeAfterRequestGeneration.current += 1
    }
  }, [loadBeforeAfter])

  const featuredReviewRequestGeneration = useRef(0)
  const loadFeaturedReview = useCallback(async () => {
    const generation = ++featuredReviewRequestGeneration.current
    setFeaturedReviewLoading(true)
    setFeaturedReviewLoadError(false)
    try {
      const { data } = await api.get<unknown>('/api/reviews/featured/random')
      const review = parsePublicHomeFeaturedReview(data)
      if (generation !== featuredReviewRequestGeneration.current) return
      if (review === undefined) throw new Error('Invalid featured review response')
      setFeaturedReview(review)
    } catch {
      if (generation !== featuredReviewRequestGeneration.current) return
      setFeaturedReviewLoadError(true)
    } finally {
      if (generation === featuredReviewRequestGeneration.current) {
        setFeaturedReviewLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!reviewsOn) return
    void loadFeaturedReview()
    return () => {
      featuredReviewRequestGeneration.current += 1
    }
  }, [loadFeaturedReview, reviewsOn])

  const heroImage = getSetting('public_hero_image', '')
  const heroTitle = getSetting('public_hero_title', t('public.home.heroTitleFallback'))
  const heroSubtitle = getSetting(
    'public_hero_subtitle',
    t('public.home.heroSubtitleFallback'),
  )

  const aboutImage = getSetting('public_about_image', '')
  const aboutTitle = getSetting('public_about_title', t('public.home.aboutTitleFallback'))
  const aboutText = getSetting('public_about_text', t('public.home.aboutTextFallback'))

  const highlights = [
    {
      icon: Star,
      title: getSetting('public_highlight_1_title', t('public.home.highlight1Title')),
      text: getSetting('public_highlight_1_text', t('public.home.highlight1Text')),
    },
    {
      icon: Clock,
      title: getSetting('public_highlight_2_title', t('public.home.highlight2Title')),
      text: getSetting('public_highlight_2_text', t('public.home.highlight2Text')),
    },
    {
      icon: CheckCircle2,
      title: getSetting('public_highlight_3_title', t('public.home.highlight3Title')),
      text: getSetting('public_highlight_3_text', t('public.home.highlight3Text')),
    },
  ]

  const titleLines = heroTitle.split('\n')
  const titleFirst = titleLines[0] ?? heroTitle
  const titleRest = titleLines.slice(1).join(' ')

  return (
    <div data-aurum-page="home" className="bg-white">
      <section data-aurum-hero className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div
          data-aurum-hero-image
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: cssBackgroundImage(heroImage) }}
        />
        <div data-aurum-hero-overlay className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/60" />
        <div data-home-hero-content className="relative z-10 mx-auto max-w-5xl px-4 py-24 md:py-28 text-center text-white">
          <MotionDiv initial="hidden" animate="visible" variants={staggerContainer}>
            <MotionDiv variants={fadeUp}>
              <div className="uppercase tracking-widest text-brand-champagne font-semibold text-sm mb-4">
                {t('public.home.heroKicker')}
              </div>
            </MotionDiv>
            <MotionDiv variants={fadeUp}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-light leading-[1.1] whitespace-pre-line">
                {titleRest ? (
                  <>
                    {titleFirst}
                    <br />
                    <span className="text-brand-champagne font-semibold">{titleRest}</span>
                  </>
                ) : (
                  heroTitle
                )}
              </h1>
            </MotionDiv>
            <MotionDiv variants={fadeUp}>
              <div className="text-lg md:text-xl text-slate-200 mt-6 mb-10 max-w-2xl mx-auto">
                {heroSubtitle}
              </div>
            </MotionDiv>
            <MotionDiv variants={fadeUp}>
              <div data-home-hero-actions className="flex items-center justify-center gap-4 flex-wrap">
                <Button asChild variant="onDark" size="lg" className="px-8" data-aurum-cta="primary">
                  <Link to="/rezervacija">
                    {getSetting('public_hero_cta_text_web', t('public.home.heroReserve'))}
                  </Link>
                </Button>
                <Button asChild variant="onDarkOutline" size="lg" className="px-8" data-aurum-cta="secondary">
                  <Link to="/usluge">{t('public.home.allServices')}</Link>
                </Button>
              </div>
            </MotionDiv>
          </MotionDiv>
        </div>
      </section>

      <section data-home-highlights className="py-20 bg-slate-50/80">
        <div className="mx-auto max-w-6xl px-4">
          <MotionDiv
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {highlights.map((item, idx) => {
              const Icon = item.icon
              return (
                <MotionDiv
                  key={idx}
                  data-home-highlight
                  variants={fadeUp}
                  className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all text-center border border-slate-200"
                >
                  <Icon className="h-10 w-10 text-brand-gold-text mx-auto mb-4" aria-hidden="true" />
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">
                    {item.title}
                  </h2>
                  <div className="text-slate-600">{item.text}</div>
                </MotionDiv>
              )
            })}
          </MotionDiv>
        </div>
      </section>

      <section id="onama" data-home-about className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div data-home-about-image className="relative overflow-hidden rounded-2xl shadow-sm border border-slate-200 bg-slate-100">
              <MediaImage src={resolveRemoteMediaUrl(aboutImage)} alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-brand-gold-text font-semibold uppercase tracking-widest text-sm">
                {t('public.home.aboutKicker')}
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2">
                {aboutTitle}
              </h2>
              <div className="text-slate-600 mt-4 leading-relaxed max-w-xl">
                {aboutText}
              </div>
              <div className="mt-8 flex gap-3 flex-wrap">
                <Button asChild variant="outline">
                  <Link to="/usluge">{t('public.home.viewServices')}</Link>
                </Button>
                <Button asChild>
                  <Link to="/kontakt">{t('public.nav.contact')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!beforeAfterLoading && beforeAfterPairs.length === 0 && !beforeAfterLoadError ? null : (
      <section data-home-transformations className={`${publicSection.subtle} ${publicSection.base}`}>
        <div className={`${publicPage.container}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8 mb-10 md:mb-12">
            <div className="max-w-2xl">
              <div className={publicHeader.kicker}>{t('public.home.beforeAfterKicker')}</div>
              <h2 className={`${publicHeader.title} mt-2`}>{t('public.home.beforeAfterTitle')}</h2>
              <p className={`${publicHeader.subtitle} mt-3`}>
                {t('public.home.beforeAfterDescription')}
              </p>
            </div>
            {reviewsOn ? (
            <Link
              to="/zadovoljni-klijenti"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors shrink-0"
            >
              {t('public.home.beforeAfterSeeAll')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            ) : null}
          </div>

          {beforeAfterLoadError ? (
            <div className="py-8 text-center" role="alert">
              <p className="text-slate-600">{t('public.home.beforeAfterLoadFailed')}</p>
              <Button variant="outline" className="mt-3" onClick={() => void loadBeforeAfter()}>
                {t('public.home.retry')}
              </Button>
            </div>
          ) : null}
          {!beforeAfterLoadError || beforeAfterPairs.length > 0 ? (
            <BeforeAfterSpotlight
              pairs={beforeAfterPairs}
              loading={beforeAfterLoading}
              resolveBefore={(p) =>
                getImageUrl(
                  p.before.pathMedium ?? p.before.pathThumb ?? p.before.pathOriginal,
                )
              }
              resolveAfter={(p) =>
                getImageUrl(p.after.pathMedium ?? p.after.pathThumb ?? p.after.pathOriginal)
              }
            />
          ) : null}


        </div>
      </section>
      )}

      {reviewsOn && (featuredReviewLoading || featuredReviewLoadError || featuredReview) ? (
        <section aria-labelledby="homepage-featured-review-heading" data-home-review className="bg-white py-12 sm:py-16">
          <div className={`${publicPage.container}`}>
            <h2 id="homepage-featured-review-heading" className="sr-only">
              {t('public.home.featuredReviewLabel')}
            </h2>
            {featuredReviewLoading ? (
              <div role="status" aria-live="polite" className="mb-6 text-center text-slate-600">
                {t('common.loading')}
              </div>
            ) : null}
            {featuredReviewLoadError ? (
              <div className="mb-6 text-center" role="alert">
                <p className="text-slate-600">{t('public.home.featuredReviewLoadFailed')}</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => void loadFeaturedReview()}
                >
                  {t('public.home.retry')}
                </Button>
              </div>
            ) : null}
            {featuredReview ? (
              <div className="max-w-2xl mx-auto">
                <Card className="border-slate-200/80 shadow-soft rounded-2xl">
                  <CardContent className="p-6 sm:p-8">
                    <div className="text-xs font-medium text-slate-500">
                      {t('public.home.featuredReviewLabel')}
                    </div>
                    <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      {featuredReview.service?.name ?? t('public.home.serviceFallback')}
                    </div>
                    <div className="mt-3 text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {featuredReview.comment ?? ''}
                    </div>
                    {featuredReview.user ? (
                      <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
                        {featuredReview.user.avatar ? (
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={getImageUrl(featuredReview.user.avatar)}
                              alt=""
                            />
                            <AvatarFallback>
                              {`${featuredReview.user.firstName?.[0] ?? ''}${featuredReview.user.lastName?.[0] ?? ''}`}
                            </AvatarFallback>
                          </Avatar>
                        ) : null}
                        <span>
                          {`${featuredReview.user.firstName ?? ''} ${featuredReview.user.lastName ?? ''}`.trim()}
                        </span>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section data-home-cta className="relative overflow-hidden py-16 border-t border-slate-200/80 bg-slate-50/80">
        <Calendar
          className="pointer-events-none absolute -right-6 -bottom-10 h-44 w-44 text-slate-400/[0.22] sm:h-56 sm:w-56 sm:-right-10 sm:-bottom-14 md:h-64 md:w-64"
          strokeWidth={1}
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {getSetting('public_cta_title', t('public.home.ctaTitleFallback'))}
            </h2>
            <div className="text-slate-600 mt-2 max-w-xl">
              {getSetting('public_cta_subtitle', t('public.home.ctaSubtitleFallback'))}
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0 px-8" data-aurum-cta="secondary">
            <Link to="/rezervacija">{t('public.nav.reserve')}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

