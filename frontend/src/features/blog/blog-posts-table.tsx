import { MessageSquareText, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import type { BlogPost } from './types'

type Props = {
  posts: BlogPost[]
  emptyLabel: string
  onComments: (id: string, title: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function BlogPostsTable({ posts, emptyLabel, onComments, onEdit, onDelete }: Props) {
  return (
    <div className="app-table-wrap">
      <table className="app-table w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
            <th className="p-3 font-medium">Naslov</th>
            <th className="p-3 font-medium">Slug</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Datum objavljivanja</th>
            <th className="p-3 font-medium">Kreirano</th>
            <th className="p-3 text-right font-medium">Akcije</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-slate-500">{emptyLabel}</td>
            </tr>
          ) : (
            posts.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/80">
                <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{p.title}</td>
                <td className="p-3 text-slate-500">{p.slug}</td>
                <td className="p-3">
                  <Badge variant={p.isPublished ? 'success' : 'secondary'}>
                    {p.isPublished ? 'Objavljeno' : 'Nacrt'}
                  </Badge>
                </td>
                <td className="p-3">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('bs-BA') : '-'}</td>
                <td className="p-3">{new Date(p.createdAt).toLocaleDateString('bs-BA')}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <div className="relative">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Komentari" onClick={() => onComments(p.id, p.title)}>
                        <MessageSquareText className="h-4 w-4 text-teal-600" aria-hidden="true" />
                      </Button>
                      {Number(p.commentsTotalCount ?? 0) > 0 ? (
                        <span
                          className={[
                            'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] text-center text-white',
                            Number(p.commentsPendingCount ?? 0) > 0 ? 'bg-rose-600' : 'bg-emerald-600',
                          ].join(' ')}
                        >
                          {p.commentsTotalCount}
                        </span>
                      ) : null}
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Uredi" onClick={() => onEdit(p.id)}>
                      <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Obriši" onClick={() => onDelete(p.id)}>
                      <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
