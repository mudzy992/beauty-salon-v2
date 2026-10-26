import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { cssBackgroundImage } from '../../constants/media-fallback'
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'
import { MediaImage } from '../../components/media-image'
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider'
import { getUploadUrl } from '../../utils/uploadUrl'
import { Button } from '../../components/ui/button'

interface GalleryImage {
  id: string
  uploadId?: string
  sortOrder: number
  upload?: { pathOriginal: string; pathThumb?: string | null; pathMedium?: string | null }
}

interface GalleryCategory {
  id: string
  name: string
  sortOrder: number
  autoPublishConsentedPairs?: boolean
  _count?: { images: number }
  images?: GalleryImage[]
}

interface ConsentedBeforeAfterPair {
  id: string
  before: { pathOriginal: string; pathMedium: string | null; pathThumb: string | null }
  after: { pathOriginal: string; pathMedium: string | null; pathThumb: string | null }
}

const MotionDiv = motion.div

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const fadeScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
}

export default function PublicGallery() {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const [categories, setCategories] = useState<GalleryCategory[]>([])
  const [consentedPairs, setConsentedPairs] = useState<ConsentedBeforeAfterPair[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryLoadError, setCategoryLoadError] = useState(false)
  const [pairsLoadError, setPairsLoadError] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    setCategoryLoadError(false)
    try {
      const { data } = await api.get<GalleryCategory[]>('/api/gallery/categories')
      const list = Array.isArray(data)
        ? data.filter(
            (category) =>
              (category._count?.images ?? 0) > 0 || category.autoPublishConsentedPairs,
          )
        : []
      const details = await Promise.all(
        list.map((category) =>
          api
            .get<GalleryCategory>(`/api/gallery/categories/${category.id}`)
            .then((response) => response.data),
        ),
      )
      setCategories(details)
    } catch {
      setCategories([])
      setCategoryLoadError(true)
    }
  }, [])

  const loadConsentedPairs = useCallback(async () => {
    setPairsLoadError(false)
    try {
      const { data } = await api.get<{ items: ConsentedBeforeAfterPair[] }>(
        '/api/daily-log/before-after',
        { params: { limit: 50, offset: 0 } },
      )
      setConsentedPairs(Array.isArray(data?.items) ? data.items : [])
    } catch {
      setConsentedPairs([])
      setPairsLoadError(true)
    }
  }, [])

  useEffect(() => {
    void Promise.all([loadCategories(), loadConsentedPairs()]).finally(() => setLoading(false))
  }, [loadCategories, loadConsentedPairs])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  const handleClose = () => setLightboxSrc(null)

  const galleryBg = getSetting('public_gallery_bg', '')

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className={`${publicPageHero.section} relative overflow-hidden`}>
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08]"
          style={{ backgroundImage: cssBackgroundImage(galleryBg) }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white" />
        <div className={`${publicPageHero.innerNarrow} text-center relative z-[1]`}>
          <h1 className={publicHeader.title}>
            {getSetting('public_gallery_title', t('public.gallery.titleFallback'))}
          </h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            {getSetting(
              'public_gallery_subtitle',
              t('public.gallery.subtitleFallback'),
            )}
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        {loading ? (
          <div className="py-20 text-center text-slate-600">{t('public.gallery.loading')}</div>
        ) : (
          <div>
            {categoryLoadError ? (
              <div
                className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"
                role="alert"
              >
                <p className="text-sm text-amber-900">
                  {t('public.gallery.categoryLoadFailed')}
                </p>
                <Button variant="outline" className="mt-3" onClick={() => void loadCategories()}>
                  {t('public.gallery.retry')}
                </Button>
              </div>
            ) : null}
            {pairsLoadError ? (
              <div
                className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"
                role="alert"
              >
                <p className="text-sm text-amber-900">
                  {t('public.gallery.beforeAfterLoadFailed')}
                </p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => void loadConsentedPairs()}
                >
                  {t('public.gallery.retry')}
                </Button>
              </div>
            ) : null}
            {consentedPairs.length > 0 &&
            !sortedCategories.some((category) => category.autoPublishConsentedPairs) ? (
              <section className="mb-16">
                <div className="mb-7 max-w-3xl">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950 pb-3 border-b border-slate-200/80">
                    {t('public.gallery.beforeAfterTitle')}
                  </h2>
                  <p className="mt-3 text-sm text-slate-600">
                    {t('public.gallery.consentDescription')}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {consentedPairs.map((pair) => {
                    const beforeSrc = getUploadUrl(pair.before.pathOriginal)
                    const afterSrc = getUploadUrl(pair.after.pathOriginal)
                    return (
                      <article key={pair.id} className="min-w-0">
                        <BeforeAfterSlider
                          beforeSrc={beforeSrc}
                          afterSrc={afterSrc}
                          alt={t('public.beforeAfter.comparisonLabels')}
                          ariaLabel={t('public.beforeAfter.sliderLabel')}
                        />
                        <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
                          <span>{t('public.beforeAfter.before')}</span>
                          <span>{t('public.beforeAfter.after')}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {sortedCategories.length === 0 ? (
              consentedPairs.length === 0 && !categoryLoadError && !pairsLoadError ? (
                <div className="text-center text-slate-500 text-lg">{t('common.noData')}</div>
              ) : null
            ) : (
              <MotionDiv variants={stagger} initial="hidden" animate="visible">
                {sortedCategories.map((cat) => (
                  <div key={cat.id} className="mb-16">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950 pb-3 mb-8 border-b border-slate-200/80">
                      {cat.name}
                    </h2>

                    {cat.autoPublishConsentedPairs ? (
                      <div className="mb-8">
                        <p className="mb-4 text-sm text-slate-600">
                          {t('public.gallery.automaticConsentDescription')}
                        </p>
                        {consentedPairs.length ? (
                          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {consentedPairs.map((pair) => (
                              <article key={pair.id} className="min-w-0">
                                <BeforeAfterSlider
                                  beforeSrc={getUploadUrl(pair.before.pathOriginal)}
                                  afterSrc={getUploadUrl(pair.after.pathOriginal)}
                                  alt={t('public.beforeAfter.comparisonLabels')}
                                  ariaLabel={t('public.beforeAfter.sliderLabel')}
                                />
                                <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
                                  <span>{t('public.beforeAfter.before')}</span>
                                  <span>{t('public.beforeAfter.after')}</span>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : pairsLoadError ? null : (
                          <p className="text-sm italic text-slate-500">
                            {t('public.gallery.noConsentedPairs')}
                          </p>
                        )}
                      </div>
                    ) : null}

                    {cat.images?.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {cat.images
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((img) => {
                            const thumbUrl = img.upload
                              ? getUploadUrl(
                                  img.upload.pathMedium ||
                                    img.upload.pathThumb ||
                                    img.upload.pathOriginal,
                                )
                              : ''
                            const originalUrl = img.upload
                              ? getUploadUrl(img.upload.pathOriginal)
                              : ''
                            return (
                              <MotionDiv
                                key={img.id}
                                variants={fadeScale}
                                className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm"
                                onClick={() => {
                                  if (originalUrl) setLightboxSrc(originalUrl)
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    if (originalUrl) setLightboxSrc(originalUrl)
                                  }
                                }}
                                aria-label={t('public.gallery.openImage')}
                              >
                                <MediaImage
                                  src={thumbUrl}
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                              </MotionDiv>
                            )
                          })}
                      </div>
                    ) : cat.autoPublishConsentedPairs ? null : (
                      <div className="text-slate-500 italic">{t('common.noData')}</div>
                    )}
                  </div>
                ))}
              </MotionDiv>
            )}
          </div>
        )}
      </div>

      {lightboxSrc ? (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -top-12 right-0 inline-flex items-center justify-center rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
              onClick={handleClose}
              aria-label={t('public.gallery.closeImage')}
            >
              <X className="h-4 w-4" />
            </button>
            <MediaImage
              src={lightboxSrc}
              alt=""
              className="max-w-[90vw] max-h-[80vh] object-contain"
            />
            <div className="mt-3 flex justify-center">
              <a
                href={lightboxSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-sm hover:underline inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('public.gallery.openOriginal')}
              </a>
            </div>
            <div className="mt-4 flex justify-center">
              <Button variant="onDarkOutline" onClick={handleClose}>
                {t('public.gallery.close')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

