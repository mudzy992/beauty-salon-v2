import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'

/**
 * Forma za novi komentar na javnom blogu (S9).
 *
 * Izdvojeno iz `public-blog-comments.tsx` bez promjene: isti `fieldset` +
 * `sr-only` `legend`, isti `htmlFor`/`id` par `public-blog-comment`, isti
 * `aria-describedby` na hint, isti `aria-busy` i isti `role="status"`
 * oglašenje pri slanju. N logged-in korisnik dobija isti link za prijavu.
 */
export function PublicBlogCommentForm({
  slug,
  user,
  newComment,
  submitting,
  onChange,
  onSubmit,
}: {
  slug: string
  user: boolean
  newComment: string
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const { t } = useTranslation()

  return (
    <>
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
          <p id="public-blog-comment-hint" className="mt-1 text-xs text-content-strong">
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
        <div className="py-4 text-content-strong">
          <Button asChild variant="outline" size="sm">
            <Link to="/login" state={{ from: `/blog/${slug}` }}>
              {t('public.blogComments.login')}
            </Link>
          </Button>
        </div>
      )}
    </>
  )
}
