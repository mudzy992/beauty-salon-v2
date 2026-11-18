import { MessageSquareText, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import { EmptyState } from '../shell/admin/ui/data-state'
import type { BlogPost } from './types'

type Props = {
  posts: BlogPost[]
  emptyLabel: string
  onComments: (id: string, title: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function BlogPostsTable({ posts, emptyLabel, onComments, onEdit, onDelete }: Props) {
  const { t, i18n } = useTranslation()

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language).format(new Date(value))

  const columns: DataTableColumn<BlogPost>[] = [
    {
      key: 'title',
      headerKey: 'blog.title',
      render: (post) => <span className="font-medium text-content">{post.title}</span>,
    },
    {
      key: 'slug',
      headerKey: 'blog.admin.slug',
      render: (post) => <span className="text-content-strong">{post.slug}</span>,
    },
    {
      key: 'status',
      headerKey: 'blog.admin.status',
      render: (post) => (
        <Badge variant={post.isPublished ? 'success' : 'secondary'}>
          {post.isPublished ? t('blog.published') : t('blog.draft')}
        </Badge>
      ),
    },
    {
      key: 'publishDate',
      headerKey: 'blog.admin.publishDate',
      render: (post) => (post.publishedAt ? formatDate(post.publishedAt) : '-'),
    },
    {
      key: 'created',
      headerKey: 'blog.admin.created',
      render: (post) => formatDate(post.createdAt),
    },
    {
      key: 'actions',
      headerKey: 'blog.admin.actions',
      align: 'right',
      render: (post) => (
        <div className="flex justify-end gap-1">
          <div className="relative">
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('blog.admin.comments')} onClick={() => onComments(post.id, post.title)}>
              <MessageSquareText className="h-4 w-4 text-teal-600" aria-hidden="true" />
            </Button>
            {Number(post.commentsTotalCount ?? 0) > 0 ? (
              <span
                className={[
                  'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] text-center text-white',
                  Number(post.commentsPendingCount ?? 0) > 0 ? 'bg-rose-600' : 'bg-emerald-600',
                ].join(' ')}
              >
                {post.commentsTotalCount}
              </span>
            ) : null}
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('common.edit')} onClick={() => onEdit(post.id)}>
            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('common.delete')} onClick={() => onDelete(post.id)}>
            <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      caption={t('blog.admin.tableCaption')}
      columns={columns}
      rows={posts}
      rowKey={(post) => post.id}
      empty={<EmptyState title={emptyLabel} />}
    />
  )
}
