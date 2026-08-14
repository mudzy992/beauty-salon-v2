import { useEffect, useState } from 'react'
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
import { cssBackgroundImage, resolveRemoteMediaUrl } from '../../constants/media-fallback'
import { getUploadUrl } from '../../utils/uploadUrl'

const MotionDiv = motion.div

interface BeforeAfterPair {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}

interface FeaturedReview {
  id: string
  serviceRating: number
  stylistRating: number | null
  comment: string | null
  user?: { firstName: string | null; lastName: string | null }
  service?: { name: string }
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
  const [beforeAfterPairs, setBeforeAfterPairs] = useState<BeforeAfterPair[]>([])
  const [beforeAfterLoading, setBeforeAfterLoading] = useState(true)
  const [featuredReview, setFeaturedReview] = useState<FeaturedReview | null>(null)

  useEffect(() => {
    api
      .get<{ items: BeforeAfterPair[] }>('/api/daily-log/before-after', {
        params: { limit: 6, random: 1 },
      })
      .then((r) => {
        const list = Array.isArray(r.data?.items) ? r.data.items : []
        setBeforeAfterPairs(list)
      })
      .catch(() => setBeforeAfterPairs([]))
      .finally(() => setBeforeAfterLoading(false))
  }, [])

  useEffect(() => {
    api
      .get<FeaturedReview | null>('/api/reviews/featured/random')
      .then((r) => setFeaturedReview(r.data ?? null))
      .catch(() => setFeaturedReview(null))
  }, [])

  const heroImage = getSetting('public_hero_image', '')
  const heroTitle = getSetting('public_hero_title', 'Otkrijte Svoju\nSavršenu Ljepotu')
  const heroSubtitle = getSetting(
    'public_hero_subtitle',
    'Vaš ekskluzivni muško-ženski frizerski salon. Prepustite se rukama profesionalaca za moderni rez i njegu kakvu zaslužujete.',
  )

  const reviewsOn = isPublicFeatureOn(getSetting, 'public_feature_reviews')
  const aboutTitle = getSetting('public_about_title', 'Vaša Kosa Je Naša Strast')
  const aboutText = getSetting(
    'public_about_text',
    'Beauty Salon Nejra je frizerski salon posvećen vrhunskoj njezi kose za muškarce i žene. Od prvog trenutka kada zakoračite u naš salon, naš cilj je da dobijete savršenu frizuru i osjećate se njegovano.',
  )

  const highlights = [
    {
      icon: Star,
      title: getSetting('public_highlight_1_title', 'Najbolji Frizeri'),
      text: getSetting(
        'public_highlight_1_text',
        'Naš tim stalno prati svjetske trendove u šišanju i kolorizaciji.',
      ),
    },
    {
      icon: Clock,
      title: getSetting('public_highlight_2_title', 'Ušteda Vremena'),
      text: getSetting(
        'public_highlight_2_text',
        'Brza i jednostavna online rezervacija vašeg termina.',
      ),
    },
    {
      icon: CheckCircle2,
      title: getSetting('public_highlight_3_title', 'Vrhunski Proizvodi'),
      text: getSetting(
        'public_highlight_3_text',
        'Koristimo isključivo profesionalne preparate za njegu vaše kose.',
      ),
    },
  ]

  const titleLines = heroTitle.split('\n')
  const titleFirst = titleLines[0] ?? heroTitle
  const titleRest = titleLines.slice(1).join(' ')

  return (
    <div className="bg-white">
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: cssBackgroundImage(heroImage) }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/60" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-24 md:py-28 text-center text-white">
          <MotionDiv initial="hidden" animate="visible" variants={staggerContainer}>
            <MotionDiv variants={fadeUp}>
              <div className="uppercase tracking-widest text-brand-champagne font-semibold text-sm mb-4">
                Elegancija & Stil
              </div>
            </MotionDiv>
            <MotionDiv variants={fadeUp}>
              <div className="text-4xl sm:text-5xl md:text-6xl font-light leading-[1.1] whitespace-pre-line">
                {titleRest ? (
                  <>
                    {titleFirst}
                    <br />
                    <span className="text-brand-champagne font-semibold">{titleRest}</span>
                  </>
                ) : (
                  heroTitle
                )}
              </div>
            </MotionDiv>
            <MotionDiv variants={fadeUp}>
              <div className="text-lg md:text-xl text-slate-200 mt-6 mb-10 max-w-2xl mx-auto">
                {heroSubtitle}
              </div>
            </MotionDiv>
            <MotionDiv variants={fadeUp}>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link to="/rezervacija">
                  <Button variant="onDark" size="lg" className="px-8">
                    {getSetting('public_hero_cta_text_web', 'Rezervišite termin')}
                  </Button>
                </Link>
                <Link to="/usluge">
                  <Button variant="onDarkOutline" size="lg" className="px-8">
                    Sve Usluge
                  </Button>
                </Link>
              </div>
            </MotionDiv>
          </MotionDiv>
        </div>
      </section>

      <section className="py-20 bg-slate-50/80">
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
                  variants={fadeUp}
                  className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all text-center border border-slate-200"
                >
                  <Icon className="h-10 w-10 text-brand-gold mx-auto mb-4" />
                  <div className="text-lg font-semibold text-slate-900 mb-2">
                    {item.title}
                  </div>
                  <div className="text-slate-600">{item.text}</div>
                </MotionDiv>
              )
            })}
          </MotionDiv>
        </div>
      </section>

      <section id="onama" className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="relative overflow-hidden rounded-2xl shadow-sm border border-slate-200 bg-slate-100">
              <MediaImage src={resolveRemoteMediaUrl(aboutImage)} alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-brand-gold font-semibold uppercase tracking-widest text-sm">
                O nama
              </div>
              <div className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2">
                {aboutTitle}
              </div>
              <div className="text-slate-600 mt-4 leading-relaxed max-w-xl">
                {aboutText}
              </div>
              <div className="mt-8 flex gap-3 flex-wrap">
                <Link to="/usluge">
                  <Button variant="outline">Pogledaj usluge</Button>
                </Link>
                <Link to="/kontakt">
                  <Button>Kontakt</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!beforeAfterLoading && beforeAfterPairs.length === 0 ? null : (
      <section className={`${publicSection.subtle} ${publicSection.base}`}>
        <div className={`${publicPage.container}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8 mb-10 md:mb-12">
            <div className="max-w-2xl">
              <div className={publicHeader.kicker}>Prije / poslije</div>
              <h2 className={`${publicHeader.title} mt-2`}>Urađeni radovi</h2>
              <p className={`${publicHeader.subtitle} mt-3`}>
                Jedna transformacija u fokusu. Ostale su u pregledu sa strane — kliknite za
                usporedbu ili pričekajte da se lista lagano pomiče.
              </p>
            </div>
            {reviewsOn ? (
            <Link
              to="/zadovoljni-klijenti"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors shrink-0"
            >
              Pogledaj sve
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            ) : null}
          </div>

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

          {reviewsOn && featuredReview ? (
            <div className="mt-12 md:mt-16 max-w-2xl mx-auto">
              <Card className="border-slate-200/80 shadow-soft rounded-2xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="text-xs font-medium text-slate-500">Nasumična recenzija</div>
                  <div className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                    {featuredReview.service?.name ?? 'Usluga'}
                  </div>
                  <div className="mt-3 text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {featuredReview.comment ?? ''}
                  </div>
                  <div className="mt-4 text-sm text-slate-500">
                    {featuredReview.user
                      ? `${featuredReview.user.firstName ?? ''} ${featuredReview.user.lastName ?? ''}`.trim()
                      : ''}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </section>
      )}

      <section className="relative overflow-hidden py-16 border-t border-slate-200/80 bg-slate-50/80">
        <Calendar
          className="pointer-events-none absolute -right-6 -bottom-10 h-44 w-44 text-slate-400/[0.22] sm:h-56 sm:w-56 sm:-right-10 sm:-bottom-14 md:h-64 md:w-64"
          strokeWidth={1}
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <div className="text-2xl font-semibold tracking-tight text-slate-950">
              {getSetting('public_cta_title', 'Spremni za novu frizuru?')}
            </div>
            <div className="text-slate-600 mt-2 max-w-xl">
              {getSetting(
                'public_cta_subtitle',
                'Rezervišite termin online u par klikova.',
              )}
            </div>
          </div>
          <Link to="/rezervacija" className="shrink-0">
            <Button size="lg" className="px-8">
              {t('public.nav.reserve')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

