import { Check, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import type { BlogComment } from './types'

type Props = {
  open: boolean
  title: string
  comments: BlogComment[]
  loading: boolean
  loadError: boolean
  onOpenChange: (open: boolean) => void
  onRetry: () => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
}

const commentAuthor = (u: BlogComment['user'] | undefined, fallback: string) => {
  if (!u) return fallback
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username
}

export function BlogCommentsDialog({
  open,
  title,
  comments,
  loading,
  loadError,
  onOpenChange,
  onRetry,
  onApprove,
  onDelete,
}: Props) {
  const { t, i18n } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('blog.admin.commentsForPost', { title })}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center p-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
        ) : loadError ? (
          <div role="alert" className="text-sm text-slate-600">
            <p>{t('blog.admin.commentLoadFailed')}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={onRetry}>
              {t('common.retry')}
            </Button>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-500">{t('blog.admin.noComments')}</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className={[
                  'rounded-md border p-3',
                  c.isApproved
                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {commentAuthor(c.user, t('blog.admin.unknownAuthor'))}
                      </p>
                      <Badge variant={c.isApproved ? 'success' : 'warning'}>
                        {c.isApproved
                          ? t('blog.admin.commentApproved')
                          : t('blog.admin.commentPending')}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-900 dark:text-slate-50">{c.content}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(c.createdAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!c.isApproved ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label={t('blog.admin.approve')}
                        onClick={() => onApprove(c.id)}
                      >
                        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('common.delete')}
                      onClick={() => onDelete(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
