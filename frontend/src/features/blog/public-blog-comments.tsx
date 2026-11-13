import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'

type Comment = {
  id: string
  content: string
  createdAt: string
  user: { firstName: string; lastName: string }
}

type Props = {
  slug: string
  user: unknown
  comments: Comment[]
  total: number
  loading: boolean
  loadError: boolean
  loadingMore: boolean
  hasMore: boolean
  newComment: string
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onRetryComments: () => void
  onLoadMore: () => void
}

export function PublicBlogComments({
  slug,
  user,
  comments,
  total,
  loading,
  loadError,
  loadingMore,
  hasMore,
  newComment,
  submitting,
  onChange,
  onSubmit,
  onRetryComments,
  onLoadMore,
}: Props) {
  const { t, i18n } = useTranslation()

  return (
    <>
      <div data-aurum-comments-rule className="my-10 h-px bg-slate-200" />
      <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950" data-aurum-comments>
        <MessageCircle className="h-5 w-5 text-slate-500" aria-hidden />
        {t('public.blogComments.title')} {total > 0 && `(${total})`}
      </h2>
      {user ? (
        <fieldset className="mb-8 space-y-4 border-0 p-0">
          <legend className="sr-only">{t('public.blogComments.legend')}</legend>
          <Label htmlFor="public-blog-comment">
            {t('public.blogComments.placeholder')}
          </Label>
          <Textarea
            id="public-blog-comment"
            value={newComment}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            maxLength={2000}
            aria-describedby="public-blog-comment-hint"
            className="resize-y"
          />
          <p id="public-blog-comment-hint" className="mt-1 text-xs text-content-muted">
            {t('public.blogComments.hint')}
          </p>
          <Button
            onClick={onSubmit}
            disabled={submitting || !newComment.trim()}
            aria-busy={submitting}
          >
            {submitting ? t('public.blogComments.submitting') : t('public.blogComments.submit')}
          </Button>
          {submitting ? (
            <span role="status" aria-live="polite" className="sr-only">
              {t('public.blogComments.submitting')}
            </span>
          ) : null}
        </fieldset>
      ) : (
        <div className="py-4 text-slate-600">
          <Button asChild variant="outline" size="sm">
            <Link to="/login" state={{ from: `/blog/${slug}` }}>
              {t('public.blogComments.login')}
            </Link>
          </Button>
        </div>
      )}
      {loading ? (
        <div role="status" aria-live="polite" data-aurum-skeleton className="py-8 text-center text-slate-600">{t('common.loading')}</div>
      ) : loadError && comments.length === 0 ? (
        <div role="alert" className="text-slate-600">
          <p>{t('public.blogComments.loadFailed')}</p>
          <Button variant="outline" className="mt-3" onClick={onRetryComments}>
            {t('common.retry')}
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <div className="italic text-slate-500">{t('public.blogComments.empty')}</div>
      ) : (
        <div className="space-y-6">
          {comments.map((c) => (
            <div data-aurum-comment key={c.id} className="border-b border-slate-100 py-4 last:border-b-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="font-semibold text-slate-800">
                  {c.user.firstName} {c.user.lastName}
                </div>
                <div className="text-sm text-slate-500">
                  {new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(c.createdAt))}
                </div>
              </div>
              <div className="whitespace-pre-wrap break-words text-slate-700">{c.content}</div>
            </div>
          ))}
        </div>
      )}
      {loadError && comments.length > 0 ? (
        <div role="alert" className="mt-6 text-slate-600">
          <p>{t('public.blogComments.loadFailed')}</p>
          <Button variant="outline" className="mt-3" onClick={onRetryComments}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
      {hasMore && !loadError ? (
        <div className="mt-6">
          <Button onClick={onLoadMore} disabled={loadingMore} variant="outline">
            {loadingMore
              ? t('public.blogComments.loadingMore')
              : t('public.blogComments.loadMore')}
          </Button>
          {loadingMore ? (
            <span role="status" aria-live="polite" className="sr-only">
              {t('public.blogComments.loadingMore')}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
