import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Copy, ExternalLink, MessageCircle, Share2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { publicPage } from '../../features/shell/public/public-ui'
import { Textarea } from '../../components/ui/textarea'
import { useAppToast } from '../../lib/toast/useAppToast'
import api from '../../api/client'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { useAuth } from '../../context/AuthContext'
import { Seo } from '../../seo/Seo'
import { site } from '../../seo/site'

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string | null;
  heroImage?: string | null;
}

interface BlogComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
}

const toPlainText = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toExcerpt = (value: string, maxLen: number): string => {
  const text = toPlainText(value)
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen).trimEnd()}…`
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
      .finally(() => setLoading(false));
  }, [slug])

  const loadComments = useCallback(() => {
    if (!post?.id) return
    setCommentsLoading(true)
    api
      .get<BlogComment[]>(`/api/blog/${post.id}/comments`, { params: { approved: 'true' } })
      .then((r) => setComments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [post?.id])

  useEffect(() => {
    loadPost()
  }, [loadPost])

  useEffect(() => {
    if (post?.id) loadComments()
  }, [post?.id, loadComments])

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

  if (loading) {
    return <div className="py-20 text-center text-slate-600">Učitavanje…</div>
  }
  if (!post) {
    return (
      <div className="py-20 text-center text-lg text-slate-700">
        Članak nije pronađen.
      </div>
    )
  }

  const canonicalPath = `/blog/${post.slug}`
  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.origin + canonicalPath
      : `${site.baseUrl}${canonicalPath}`
  const description = toExcerpt(post.content || '', 160) || 'Pročitajte članak na blogu Beauty Salon Nejra.'
  const ogImage = post.heroImage ? getUploadUrl(post.heroImage) : site.defaultOgImagePath
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    datePublished: post.publishedAt || undefined,
    dateModified: post.publishedAt || undefined,
    image: ogImage ? (ogImage.startsWith('http') ? ogImage : `${site.baseUrl}${ogImage}`) : undefined,
    mainEntityOfPage: `${site.baseUrl}${canonicalPath}`,
    publisher: {
      '@type': 'Organization',
      name: site.siteName,
      url: site.baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${site.baseUrl}${site.defaultOgImagePath}`,
      },
    },
  }

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as any).share({ title: post.title, text: post.title, url: shareUrl })
        return
      }
    } catch {
      // fallthrough to copy
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1500)
      toast.success('Link kopiran.')
    } catch {
      toast.error('Ne mogu kopirati link.')
    }
  }

  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(post.title)
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const xShare = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
  const viberShare = `viber://forward?text=${encodedUrl}`
  const waShare = `https://wa.me/?text=${encodedUrl}`

  return (
    <div className="bg-white min-h-screen pb-20">
      <Seo
        title={post.title}
        description={description}
        canonicalUrl={canonicalPath}
        og={{ type: 'article', image: ogImage }}
        twitter={{ image: ogImage }}
        jsonLd={jsonLd}
      />
      <div className={publicPage.containerNarrow}>
        <Link to="/blog" className="inline-flex mb-6 pt-8">
          <Button variant="ghost" className="-ml-2">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Nazad na blog
            </span>
          </Button>
        </Link>

        <div className="relative min-h-[220px] md:min-h-[300px] overflow-hidden rounded-2xl border border-slate-200/80 shadow-soft">
          <MediaImage
            src={post.heroImage ? getUploadUrl(post.heroImage) : ''}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col items-start">
            <div className="flex items-center gap-2 text-white/85 text-sm mb-2">
              <Calendar className="h-4 w-4" aria-hidden />
              <div>
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString('bs-BA')
                  : ''}
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
              {post.title}
            </h1>
          </div>
        </div>

        <div className={`px-0 md:px-2 ${publicPage.contentAfterHero}`}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleShare()}>
              <Share2 className="mr-2 h-4 w-4" aria-hidden />
              Dijeli
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard
                  .writeText(shareUrl)
                  .then(() => {
                    setShareCopied(true)
                    setTimeout(() => setShareCopied(false), 1500)
                    toast.success('Link kopiran.')
                  })
                  .catch(() => toast.error('Ne mogu kopirati link.'))
              }}
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden />
              {shareCopied ? 'Kopirano' : 'Kopiraj link'}
            </Button>
            <a href={fbShare} target="_blank" rel="noreferrer">
              <Button type="button" variant="ghost" size="sm">
                <ExternalLink className="mr-2 h-4 w-4 opacity-70" aria-hidden />
                Facebook
              </Button>
            </a>
            <a href={xShare} target="_blank" rel="noreferrer">
              <Button type="button" variant="ghost" size="sm">
                <ExternalLink className="mr-2 h-4 w-4 opacity-70" aria-hidden />
                X
              </Button>
            </a>
            <a href={viberShare} target="_blank" rel="noreferrer">
              <Button type="button" variant="ghost" size="sm">
                Viber
              </Button>
            </a>
            <a href={waShare} target="_blank" rel="noreferrer">
              <Button type="button" variant="ghost" size="sm">
                WhatsApp
              </Button>
            </a>
          </div>
          <div
            className="blog-content text-lg leading-relaxed text-slate-700 mb-14"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />

          {/* Komentari */}
          <div className="my-10 h-px bg-slate-200" />
          <div className="text-xl font-semibold tracking-tight text-slate-950 mb-6 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-slate-500" aria-hidden />
            Komentari {comments.length > 0 && `(${comments.length})`}
          </div>

          {user ? (
            <div className="space-y-4 mb-8">
              <Textarea
                placeholder="Napišite komentar..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                maxLength={2000}
                className="resize-y"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? 'Slanje…' : 'Pošalji komentar'}
              </Button>
            </div>
          ) : (
            <div className="py-4 text-slate-600">
              <Link to="/login" state={{ from: `/blog/${post.slug}` } as any}>
                <Button variant="outline" size="sm">
                  Prijavite se da biste komentarisali
                </Button>
              </Link>
            </div>
          )}

          {commentsLoading ? (
            <div className="py-8 text-center text-slate-600">Učitavanje…</div>
          ) : comments.length === 0 ? (
            <div className="text-slate-500 italic">Nema odobrenih komentara.</div>
          ) : (
            <div className="space-y-6">
              {comments.map((c) => (
                <div key={c.id} className="py-4 border-b border-slate-100 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-semibold text-slate-800">
                      {c.user.firstName} {c.user.lastName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(c.createdAt).toLocaleString('bs-BA')}
                    </div>
                  </div>
                  <div className="text-slate-700 whitespace-pre-wrap">{c.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
