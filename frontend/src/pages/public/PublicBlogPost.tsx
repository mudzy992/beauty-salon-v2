import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { publicPage } from '../../features/shell/public/public-ui'
import { useAppToast } from '../../lib/toast/useAppToast'
import api from '../../api/client'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Seo } from '../../seo/Seo'
import { site } from '../../seo/site'
import { PublicBlogComments } from '../../features/blog/public-blog-comments'
import { buildPublicBlogPostSeo } from '../../features/blog/public-blog-post-seo'
import { PublicBlogShare } from '../../features/blog/public-blog-share'
import {
  parsePublicBlogPost,
  type PublicBlogPost,
} from '../../features/blog/public-blog-post-data.mjs'
import {
  parsePublicBlogComments,
  type PublicBlogComment,
} from '../../features/blog/public-blog-comments-data.mjs'

type BlogComment = PublicBlogComment

const COMMENT_PAGE_SIZE = 20

export default function PublicBlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const toast = useAppToast()
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const [post, setPost] = useState<PublicBlogPost | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<BlogComment[]>([])
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsLoadError, setCommentsLoadError] = useState(false)
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false)
  const [commentsHasMore, setCommentsHasMore] = useState(false)
  const [commentsNextOffset, setCommentsNextOffset] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const postRequestGeneration = useRef(0)
  const commentSubmissionGeneration = useRef(0)
  const commentSubmissionInFlight = useRef(false)
  const loadPost = useCallback(async () => {
    if (!slug) return
    const generation = ++postRequestGeneration.current
    commentSubmissionGeneration.current += 1
    commentSubmissionInFlight.current = false
    setSubmitting(false)
    setLoading(true)
    setLoadError(false)
    try {
      const { data } = await api.get<unknown>(
        `/api/blog/slug/${encodeURIComponent(slug)}`,
      )
      const validatedPost = parsePublicBlogPost(data, slug)
      if (generation !== postRequestGeneration.current) return
      if (!validatedPost) throw new Error('Invalid public blog post response')
      setPost(validatedPost)
    } catch {
      if (generation !== postRequestGeneration.current) return
      setPost(null)
      setLoadError(true)
    } finally {
      if (generation === postRequestGeneration.current) setLoading(false)
    }
  }, [slug])

  const commentsRequestGeneration = useRef(0)
  const commentsRetryRef = useRef({ offset: 0, append: false })
  const loadComments = useCallback(async (offset = 0, append = false) => {
    if (!post?.id) return
    const generation = ++commentsRequestGeneration.current
    commentsRetryRef.current = { offset, append }
    setCommentsLoadError(false)
    if (append) setCommentsLoadingMore(true)
    else setCommentsLoading(true)
    try {
      const { data } = await api.get<unknown>(
        `/api/blog/${post.id}/comments`,
        { params: { limit: COMMENT_PAGE_SIZE, offset } },
      )
      const page = parsePublicBlogComments(data, COMMENT_PAGE_SIZE, offset)
      if (generation !== commentsRequestGeneration.current) return
      if (!page) throw new Error('Invalid public blog comments response')
      setComments((current) => (append ? [...current, ...page.items] : page.items))
      setCommentsTotal(page.total)
      setCommentsHasMore(page.hasMore)
      setCommentsNextOffset(page.nextOffset)
    } catch {
      if (generation !== commentsRequestGeneration.current) return
      setCommentsLoadError(true)
      if (!append) {
        setComments([])
        setCommentsTotal(0)
        setCommentsHasMore(false)
        setCommentsNextOffset(0)
      }
    } finally {
      if (generation === commentsRequestGeneration.current) {
        setCommentsLoading(false)
        setCommentsLoadingMore(false)
      }
    }
  }, [post?.id])

  const retryComments = useCallback(() => {
    const { offset, append } = commentsRetryRef.current
    void loadComments(offset, append)
  }, [loadComments])

  useEffect(() => {
    void loadPost()
    return () => {
      postRequestGeneration.current += 1
      commentSubmissionGeneration.current += 1
      commentSubmissionInFlight.current = false
    }
  }, [loadPost])
  useEffect(() => {
    setNewComment('')
  }, [slug])
  useEffect(() => {
    if (!post?.id) return
    void loadComments()
    return () => {
      commentsRequestGeneration.current += 1
    }
  }, [post?.id, loadComments])

  const handleSubmitComment = async () => {
    const content = newComment.trim()
    if (!post?.id || !content || commentSubmissionInFlight.current) return
    const submittedPostId = post.id
    const generation = ++commentSubmissionGeneration.current
    commentSubmissionInFlight.current = true
    setSubmitting(true)
    try {
      await api.post(`/api/blog/${submittedPostId}/comments`, { content })
      if (generation !== commentSubmissionGeneration.current) return
      setNewComment('')
      void loadComments(0, false)
      toast.success(t('public.blogPost.commentSubmitted'))
    } catch {
      if (generation !== commentSubmissionGeneration.current) return
      toast.error(t('public.blogPost.commentSubmitFailed'))
    } finally {
      if (generation === commentSubmissionGeneration.current) {
        commentSubmissionInFlight.current = false
        setSubmitting(false)
      }
    }
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="py-20 text-center text-slate-600">
        {t('common.loading')}
      </div>
    )
  }
  if (!post) {
    return (
      <div className="py-20 text-center text-lg text-slate-700">
        {loadError ? (
          <div role="alert">
            <p>{t('public.blogPost.loadFailed')}</p>
            <Button variant="outline" className="mt-3" onClick={loadPost}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          t('public.blogPost.notFound')
        )}
      </div>
    )
  }

  const seo = buildPublicBlogPostSeo(post, t('public.blogPost.seoFallback'))
  const shareUrl =
    typeof window !== 'undefined' ? window.location.origin + seo.canonicalPath : `${site.baseUrl}${seo.canonicalPath}`

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1500)
      toast.success(t('public.blogPost.linkCopied'))
    } catch {
      toast.error(t('public.blogPost.linkCopyFailed'))
    }
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: post.title, text: post.title, url: shareUrl })
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
      }
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
        <Button asChild variant="ghost" className="-ml-2 mb-6 pt-8">
          <Link to="/blog">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t('public.blogPost.backToBlog')}
            </span>
          </Link>
        </Button>
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
              <div>
                {post.publishedAt
                  ? new Intl.DateTimeFormat(i18n.language).format(new Date(post.publishedAt))
                  : ''}
              </div>
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
          {/* Backend sanitizes on writes and public slug reads; keep this API boundary mandatory. */}
          <div
            className="blog-content mb-14 text-lg leading-relaxed text-slate-700"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />
          <PublicBlogComments
            slug={post.slug}
            user={user}
            comments={comments}
            total={commentsTotal}
            loading={commentsLoading}
            loadError={commentsLoadError}
            loadingMore={commentsLoadingMore}
            hasMore={commentsHasMore}
            newComment={newComment}
            submitting={submitting}
            onChange={setNewComment}
            onSubmit={() => void handleSubmitComment()}
            onRetryComments={retryComments}
            onLoadMore={() => void loadComments(commentsNextOffset, true)}
          />
        </div>
      </div>
    </div>
  )
}
