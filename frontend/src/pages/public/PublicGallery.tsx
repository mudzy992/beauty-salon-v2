import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { Button } from '../../components/ui/button'

interface GalleryImage {
  id: string
  uploadId: string
  sortOrder: number
  upload?: { pathOriginal: string; pathThumb?: string | null; pathMedium?: string | null }
}

interface GalleryCategory {
  id: string
  name: string
  sortOrder: number
  images?: GalleryImage[]
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
  const [loading, setLoading] = useState(true)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<GalleryCategory[]>('/api/gallery/categories')
      .then(async (r) => {
        const list = Array.isArray(r.data) ? r.data : []
        const withImages = await Promise.all(
          list.map((c) =>
            api.get<GalleryCategory>(`/api/gallery/categories/${c.id}`).then((res) => res.data),
          ),
        )
        setCategories(withImages)
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  const handleClose = () => setLightboxSrc(null)

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className={publicPageHero.section}>
        <div className={`${publicPageHero.innerNarrow} text-center`}>
          <h1 className={publicHeader.title}>
            {getSetting('public_gallery_title', 'Galerija Naših Radova')}
          </h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            {getSetting(
              'public_gallery_subtitle',
              'Zavirite u naš svijet ljepote i uvjerite se u stručnost naših frizera i stilista.',
            )}
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        {loading ? (
          <div className="py-20 text-center text-slate-600">Učitavanje…</div>
        ) : sortedCategories.length === 0 ? (
          <div className="text-center text-slate-500 text-lg">{t('common.noData')}</div>
        ) : (
          <MotionDiv variants={stagger} initial="hidden" animate="visible">
            {sortedCategories.map((cat) => (
              <div key={cat.id} className="mb-16">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 pb-3 mb-8 border-b border-slate-200/80">
                  {cat.name}
                </h2>

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
                            className="group relative overflow-hidden rounded-2xl bg-slate-100 aspect-square border border-slate-200/80 shadow-sm cursor-pointer"
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
                            aria-label="Otvori sliku"
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
                ) : (
                  <div className="text-slate-500 italic">{t('common.noData')}</div>
                )}
              </div>
            ))}
          </MotionDiv>
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
              aria-label="Zatvori"
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
                Otvori original u novom prozoru
              </a>
            </div>
            <div className="mt-4 flex justify-center">
              <Button variant="onDarkOutline" onClick={handleClose}>
                Zatvori
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

