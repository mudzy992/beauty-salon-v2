import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar } from 'lucide-react'

import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { cssBackgroundImage } from '../../constants/media-fallback'
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  heroImage?: string | null;
}

interface PublicBlogPage {
  items: BlogPost[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number;
}

const PAGE_SIZE = 20
const MotionDiv = motion.div

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function PublicBlogList() {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)

  const loadPage = useCallback(async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const { data } = await api.get<PublicBlogPage | BlogPost[]>('/api/blog', {
        params: { limit: PAGE_SIZE, offset },
      })
      const items = Array.isArray(data) ? data : data.items
      setPosts((current) => (append ? [...current, ...items] : items))
      if (Array.isArray(data)) {
        setHasMore(false)
        setNextOffset(offset + items.length)
      } else {
        setHasMore(data.hasMore)
        setNextOffset(data.nextOffset)
      }
    } catch {
      if (!append) setPosts([])
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(0, false)
  }, [loadPage])

  const blogBg = getSetting('public_blog_bg', '')

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className={`${publicPageHero.section} relative overflow-hidden`}>
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08]"
          style={{ backgroundImage: cssBackgroundImage(blogBg) }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white" />
        <div className={`${publicPageHero.innerNarrow} text-center relative z-[1]`}>
          <div className={publicHeader.kicker}>
            {getSetting('public_blog_subtitle', 'Novosti & savjeti')}
          </div>
          <h1 className={`${publicHeader.title} mt-2`}>
            {getSetting('public_blog_title', 'Naš frizerski blog')}
          </h1>
        </div>
      </div>

      <div className={`${publicPage.containerNarrow} ${publicPage.contentAfterHero}`}>
        {loading ? (
          <div className="py-20 text-center text-slate-600">Učitavanje…</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-slate-500 text-lg">{t('common.noData')}</div>
        ) : (
          <>
            <MotionDiv variants={stagger} initial="hidden" animate="visible">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {posts.map((p) => (
                  <MotionDiv
                    key={p.id}
                    variants={fadeUp}
                    className="bg-white rounded-2xl overflow-hidden shadow-soft border border-slate-200/80 hover:shadow-md transition-shadow duration-300"
                  >
                    <Link to={`/blog/${p.slug}`} className="block no-underline">
                      <div className="h-[180px] bg-slate-200 relative overflow-hidden">
                        <MediaImage
                          src={p.heroImage ? getUploadUrl(p.heroImage) : ''}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                          <Calendar className="h-4 w-4" />
                          <div>
                            {p.publishedAt
                              ? new Date(p.publishedAt).toLocaleDateString('bs-BA')
                              : ''}
                          </div>
                        </div>
                        <div className={`text-lg font-semibold text-slate-900 leading-snug ${p.excerpt ? 'mb-2' : 'mb-4'}`}>
                          {p.title}
                        </div>
                        {p.excerpt ? (
                          <p className="text-sm text-slate-600 mb-4 line-clamp-3">{p.excerpt}</p>
                        ) : null}
                        <div className="inline-flex items-center gap-2 text-slate-900 font-medium text-sm">
                          Pročitaj više <ArrowRight className="h-4 w-4" aria-hidden />
                        </div>
                      </div>
                    </Link>
                  </MotionDiv>
                ))}
              </div>
            </MotionDiv>
            {hasMore ? (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  disabled={loadingMore}
                  onClick={() => void loadPage(nextOffset, true)}
                >
                  {loadingMore ? 'Učitavanje…' : 'Učitaj još'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
