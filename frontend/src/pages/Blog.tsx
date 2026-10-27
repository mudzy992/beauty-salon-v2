import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { useAppToast } from '../lib/toast/useAppToast'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { BlogCommentsDialog } from '../features/blog/blog-comments-dialog'
import { emptyBlogPostForm, formFromPost, toBlogPostPayload } from '../features/blog/blog-post-form'
import { BlogPostFormDialog } from '../features/blog/blog-post-form-dialog'
import { BlogPostsTable } from '../features/blog/blog-posts-table'
import type { BlogComment, BlogPost, BlogPostFormValues } from '../features/blog/types'

export default function Blog() {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<BlogPostFormValues>(emptyBlogPostForm)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [commentsPostTitle, setCommentsPostTitle] = useState('')
  const [comments, setComments] = useState<BlogComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsLoadError, setCommentsLoadError] = useState(false)

  const reportApiError = (err: unknown, fallbackKey: string) => {
    const message = getErrorMessage(err, '')
    error(t(resolveAdminApiErrorKey(message, fallbackKey)))
  }

  const loadData = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    api
      .get<BlogPost[]>('/api/blog/admin')
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => {
        setPosts([])
        setLoadError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const patchForm = (patch: Partial<BlogPostFormValues>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const openForm = async (id?: string) => {
    if (id) {
      setEditId(id)
      try {
        const { data } = await api.get<BlogPost>(`/api/blog/${id}`)
        setForm(formFromPost(data))
        setOpen(true)
      } catch (err) {
        reportApiError(err, 'blog.admin.editFailed')
      }
      return
    }
    setEditId(null)
    setForm(emptyBlogPostForm())
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      warning(t('blog.admin.requiredFields'))
      return
    }
    setSaving(true)
    try {
      const payload = toBlogPostPayload(form)
      if (editId) await api.patch(`/api/blog/${editId}`, payload)
      else await api.post('/api/blog', payload)
      success(t('blog.admin.saved'))
      loadData()
      setOpen(false)
    } catch (err) {
      reportApiError(err, 'blog.admin.saveFailed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('blog.admin.deleteConfirm'))) return
    try {
      await api.delete(`/api/blog/${id}`)
      success(t('blog.admin.deleted'))
      loadData()
    } catch (err) {
      reportApiError(err, 'blog.admin.deleteFailed')
    }
  }

  const openComments = async (postId: string, postTitle: string) => {
    setCommentsPostId(postId)
    setCommentsPostTitle(postTitle)
    setCommentsLoading(true)
    setCommentsLoadError(false)
    setCommentsOpen(true)
    try {
      const { data } = await api.get<BlogComment[]>(`/api/blog/${postId}/comments/admin`)
      setComments(Array.isArray(data) ? data : [])
    } catch {
      setComments([])
      setCommentsLoadError(true)
    } finally {
      setCommentsLoading(false)
    }
  }

  const handleApproveComment = async (commentId: string) => {
    try {
      await api.patch(`/api/blog/comments/${commentId}/approve`)
      success(t('blog.admin.commentApprovedToast'))
      if (commentsPostId) void openComments(commentsPostId, commentsPostTitle)
    } catch (err) {
      reportApiError(err, 'blog.admin.approveFailed')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(t('blog.admin.deleteCommentConfirm'))) return
    try {
      await api.delete(`/api/blog/comments/${commentId}`)
      success(t('blog.admin.commentDeleted'))
      if (commentsPostId) void openComments(commentsPostId, commentsPostTitle)
    } catch (err) {
      reportApiError(err, 'blog.admin.deleteCommentFailed')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.blog')}</h1>
        <Button type="button" onClick={() => void openForm()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('blog.newPost')}
        </Button>
      </div>
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
        ) : loadError ? (
          <div role="alert" className="p-8 text-center text-slate-600">
            <p>{t('blog.admin.loadFailed')}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={loadData}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <BlogPostsTable posts={posts} emptyLabel={t('common.noData')} onComments={openComments} onEdit={openForm} onDelete={handleDelete} />
        )}
      </Card>
      <BlogPostFormDialog
        open={open}
        editId={editId}
        form={form}
        saving={saving}
        onOpenChange={setOpen}
        onChange={patchForm}
        onSave={() => void handleSave()}
        onError={error}
        onUploaded={success}
      />
      <BlogCommentsDialog
        open={commentsOpen}
        title={commentsPostTitle}
        comments={comments}
        loading={commentsLoading}
        loadError={commentsLoadError}
        onOpenChange={setCommentsOpen}
        onRetry={() => {
          if (commentsPostId) void openComments(commentsPostId, commentsPostTitle)
        }}
        onApprove={(id) => void handleApproveComment(id)}
        onDelete={(id) => void handleDeleteComment(id)}
      />
    </div>
  )
}
