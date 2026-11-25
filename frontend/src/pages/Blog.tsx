import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { BlogCommentsDialog } from '../features/blog/blog-comments-dialog'
import { BlogPostFormDialog } from '../features/blog/blog-post-form-dialog'
import { BlogPostsTable } from '../features/blog/blog-posts-table'
import { useAppToast } from '../lib/toast/useAppToast'
import { useAdminBlog } from '../features/blog/use-admin-blog'
import { useBlogComments } from '../features/blog/use-blog-comments'
import { AdminConfirmDialog, type AdminConfirmRequest } from '../features/shell/admin/ui/admin-confirm-dialog'

/**
 * Admin blog (S9).
 *
 * Stranica je **orkestrator**: objave su u `features/blog/use-admin-blog.ts`,
 * moderacija komentara u `features/blog/use-blog-comments.ts`, a editor i tabela
 * su već bili izdvojeni. Endpointi, validacija i potvrde su **nepromijenjeni**.
 */
export default function Blog() {
  const { t } = useTranslation()
  const { success, error } = useAppToast()
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)

  const blog = useAdminBlog({ setConfirmRequest })
  const comments = useBlogComments({
    setConfirmRequest,
    reportApiError: blog.reportApiError,
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-content">{t('nav.blog')}</h1>
        <Button type="button" onClick={() => void blog.openForm()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('blog.newPost')}
        </Button>
      </div>
      <Card className="overflow-hidden">
        {blog.loading ? (
          <div className="flex justify-center p-10 text-content-strong">
            <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>
        ) : blog.loadError ? (
          <div role="alert" className="p-8 text-center text-content-strong">
            <p>{t('blog.admin.loadFailed')}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={blog.loadData}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <BlogPostsTable posts={blog.posts} emptyLabel={t('common.noData')} onComments={comments.openComments} onEdit={blog.openForm} onDelete={blog.handleDelete} />
        )}
      </Card>
      <BlogPostFormDialog
        open={blog.open}
        editId={blog.editId}
        form={blog.form}
        saving={blog.saving}
        onOpenChange={blog.setOpen}
        onChange={blog.patchForm}
        onSave={() => void blog.handleSave()}
        onError={error}
        onUploaded={success}
      />
      <BlogCommentsDialog
        open={comments.commentsOpen}
        title={comments.commentsPostTitle}
        comments={comments.comments}
        loading={comments.commentsLoading}
        loadError={comments.commentsLoadError}
        onOpenChange={(next) => {
          // A parent dismiss event must never strand an open confirmation.
          if (!next && confirmRequest) setConfirmRequest(null)
          else comments.setCommentsOpen(next)
        }}
        onRetry={() => {
          if (comments.commentsPostId) void comments.openComments(comments.commentsPostId, comments.commentsPostTitle)
        }}
        onApprove={(id) => void comments.handleApproveComment(id)}
        onDelete={(id) => void comments.handleDeleteComment(id)}
        confirmation={<AdminConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
      />
      {!comments.commentsOpen && <AdminConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}
    </div>
  )
}
