import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar } from 'lucide-react'

import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { getUploadUrl } from '../../utils/uploadUrl'

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  heroImage?: string | null;
}

const MotionDiv = motion.div

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PublicBlogList() {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<BlogPost[]>('/api/blog', { params: { published: 'true' } })
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen pt-10 pb-20">
      <div className="bg-white py-16 mb-12 border-b border-slate-200 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{
            backgroundImage: `url('${getSetting(
              'public_blog_bg',
              'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=2000',
            )}')`,
          }}
        />
        <div className="mx-auto max-w-5xl px-4 relative z-10">
          <div className="text-brand-gold font-semibold uppercase tracking-widest text-sm mb-2">
            {getSetting('public_blog_subtitle', 'Novosti & Savjeti')}
          </div>
          <div className="text-4xl font-semibold text-slate-950">
            {getSetting('public_blog_title', 'Naš Frizerski Blog')}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        {loading ? (
          <div className="py-20 text-center text-slate-600">Učitavanje…</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-slate-500 text-lg">{t('common.noData')}</div>
        ) : (
          <MotionDiv variants={stagger} initial="hidden" animate="visible">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {posts.map((p) => (
                <MotionDiv
                  key={p.id}
                  variants={fadeUp}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-slate-200"
                >
                  <Link to={`/blog/${p.slug}`} className="block no-underline">
                    <div className="h-[180px] bg-slate-200 relative overflow-hidden">
                      {p.heroImage ? (
                        <img
                          src={getUploadUrl(p.heroImage)}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-brand-gold to-brand-champagne opacity-85" />
                      )}
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
                      <div className="text-lg font-semibold text-slate-900 mb-4 leading-snug">
                        {p.title}
                      </div>
                      <div className="inline-flex items-center gap-2 text-brand-gold font-semibold text-sm">
                        Pročitaj više <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                </MotionDiv>
              ))}
            </div>
          </MotionDiv>
        )}
      </div>
    </div>
  )
}
