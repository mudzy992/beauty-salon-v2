import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { publicPage } from '../../features/shell/public/public-ui'
import { useAppToast } from '../../lib/toast/useAppToast'
import api from '../../api/client'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { useAuth } from '../../context/AuthContext'
import { Seo } from '../../seo/Seo'
import { site } from '../../seo/site'
import { PublicBlogComments } from '../../features/blog/public-blog-comments'
import { buildPublicBlogPostSeo } from '../../features/blog/public-blog-post-seo'
import { PublicBlogShare } from '../../features/blog/public-blog-share'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  heroImage?: string | null
  ogImage?: string | null
  noIndex?: boolean
  publishedAt: string | null
  updatedAt?: string | null
}

interface BlogComment {
  id: string
  content: string
  createdAt: string
  user: { id: string; firstName: string; lastName: string }
}

export default function PublicBlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const toast = useAppToast()
  const { user } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<BlogComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const loadPost = useCallback(() => {
    if (!slug) return
    setLoading(true)
    api
      .get<BlogPost>(`/api/blog/slug/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false))
  }, [slug])

  const loadComments = useCallback(() => {
    if (!post?.id) return
    setCommentsLoading(true)
    api
      .get<BlogComment[]>(`/api/blog/${post.id}/comments`, { params: { approved: 'true' } })
      .then((r) => setComments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false))
  }, [post?.id])

  useEffect(() => { loadPost() }, [loadPost])
  useEffect(() => { if (post?.id) loadComments() }, [post?.id, loadComments])

  const handleSubmitComment = async () => {
    if (!post?.id || !newComment.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/api/blog/${post.id}/comments`, { content: newComment.trim() })
      setNewComment('')
      loadComments()
      toast.success('Komentar je poslan na odobrenje.')
    } catch {
      toast.error('Greška pri slanju komentara.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="py-20 text-center text-slate-600">Učitavanje…</div>
  if (!post) {
    return <div className="py-20 text-center text-lg text-slate-700">Članak nije pronađen.</div>
  }

  const seo = buildPublicBlogPostSeo(post)
  const shareUrl =
    typeof window !== 'undefined' ? window.location.origin + seo.canonicalPath : `${site.baseUrl}${seo.canonicalPath}`

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1500)
      toast.success('Link kopiran.')
    } catch {
      toast.error('Ne mogu kopirati link.')
    }
  }

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ title: post.title, text: post.title, url: shareUrl })
        return
      }
    } catch {
      // fallthrough
    }
    await copyShareUrl()
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Seo
        title={seo.title}
        description={seo.description}
        canonicalUrl={seo.canonicalPath}
        noindex={seo.noindex}
        og={{ type: 'article', image: seo.ogImage, title: seo.title, description: seo.description }}
        twitter={{ image: seo.ogImage, title: seo.title, description: seo.description }}
        jsonLd={seo.jsonLd}
      />
      <div className={publicPage.containerNarrow}>
        <Link to="/blog" className="mb-6 inline-flex pt-8">
          <Button variant="ghost" className="-ml-2">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Nazad na blog
            </span>
          </Button>
        </Link>
        <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-slate-200/80 shadow-soft md:min-h-[300px]">
          <MediaImage
            src={post.heroImage ? getUploadUrl(post.heroImage) : ''}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-start p-6 md:p-8">
            <div className="mb-2 flex items-center gap-2 text-sm text-white/85">
              <Calendar className="h-4 w-4" aria-hidden />
              <div>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('bs-BA') : ''}</div>
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">{post.title}</h1>
          </div>
        </div>
        <div className={`px-0 md:px-2 ${publicPage.contentAfterHero}`}>
          <PublicBlogShare
            title={post.title}
            shareUrl={shareUrl}
            copied={shareCopied}
            onShare={() => void handleShare()}
            onCopy={() => void copyShareUrl()}
          />
          <div
            className="blog-content mb-14 text-lg leading-relaxed text-slate-700"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />
          <PublicBlogComments
            slug={post.slug}
            user={user}
            comments={comments}
            loading={commentsLoading}
            newComment={newComment}
            submitting={submitting}
            onChange={setNewComment}
            onSubmit={() => void handleSubmitComment()}
          />
        </div>
      </div>
    </div>
  )
}
