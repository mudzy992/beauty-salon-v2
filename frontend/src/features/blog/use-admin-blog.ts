import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { getErrorCode, getErrorMessage } from '../../api/error'
import { resolveAdminApiErrorKey } from '../admin/admin-api-error.mjs'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import { emptyBlogPostForm, formFromPost, toBlogPostPayload } from './blog-post-form'
import type { BlogPost, BlogPostFormValues } from './types'

/**
 * Stanje i akcije admin bloga (S9).
 *
 * Izdvojeno iz `pages/Blog.tsx` bez promjene ponašanja: isti endpointi
 * (`/api/blog/admin`, `/api/blog/:id`), ista validacija („naslov i sadržaj su
 * obavezni“), isto mapiranje greške (`resolveAdminApiErrorKey`) i ista potvrda
 * prije brisanja objave.
 */
export function useAdminBlog({
  setConfirmRequest,
}: {
  setConfirmRequest: (request: AdminConfirmRequest | null) => void
}) {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()

  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<BlogPostFormValues>(emptyBlogPostForm)

  const reportApiError = (err: unknown, fallbackKey: string) => {
    const message = getErrorMessage(err, '')
    error(t(resolveAdminApiErrorKey(message, fallbackKey, getErrorCode(err))))
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

  const handleDelete = (id: string) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('blog.admin.deleteConfirm'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/blog/${id}`)
          success(t('blog.admin.deleted'))
          loadData()
        } catch (err) {
          reportApiError(err, 'blog.admin.deleteFailed')
        }
      },
    })
  }

  return {
    posts,
    loading,
    loadError,
    saving,
    open,
    setOpen,
    editId,
    form,
    patchForm,
    loadData,
    openForm,
    handleSave,
    handleDelete,
    reportApiError,
  }
}
