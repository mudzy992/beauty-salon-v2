import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import type { BlogComment } from './types'

/**
 * Moderacija komentara na blog objavi (S9).
 *
 * Izdvojeno iz `pages/Blog.tsx` bez promjene ponašanja: isti endpointi
 * (`/api/blog/:postId/comments/admin`, `/api/blog/comments/:id/approve`,
 * `/api/blog/comments/:id`), ista potvrda prije brisanja i isti refresh liste
 * nakon odobravanja/brisanja.
 */
export function useBlogComments({
  setConfirmRequest,
  reportApiError,
}: {
  setConfirmRequest: (request: AdminConfirmRequest | null) => void
  reportApiError: (err: unknown, fallbackKey: string) => void
}) {
  const { t } = useTranslation()
  const { success } = useAppToast()

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [commentsPostTitle, setCommentsPostTitle] = useState('')
  const [comments, setComments] = useState<BlogComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsLoadError, setCommentsLoadError] = useState(false)

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

  const handleDeleteComment = (commentId: string) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('blog.admin.deleteCommentConfirm'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/blog/comments/${commentId}`)
          success(t('blog.admin.commentDeleted'))
          if (commentsPostId) void openComments(commentsPostId, commentsPostTitle)
        } catch (err) {
          reportApiError(err, 'blog.admin.deleteCommentFailed')
        }
      },
    })
  }

  return {
    commentsOpen,
    setCommentsOpen,
    commentsPostId,
    commentsPostTitle,
    comments,
    commentsLoading,
    commentsLoadError,
    openComments,
    handleApproveComment,
    handleDeleteComment,
  }
}
