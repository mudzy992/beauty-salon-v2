import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'

type Comment = {
  id: string
  content: string
  createdAt: string
  user: { id: string; firstName: string; lastName: string }
}

type Props = {
  slug: string
  user: unknown
  comments: Comment[]
  loading: boolean
  newComment: string
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export function PublicBlogComments({
  slug,
  user,
  comments,
  loading,
  newComment,
  submitting,
  onChange,
  onSubmit,
}: Props) {
  return (
    <>
      <div className="my-10 h-px bg-slate-200" />
      <div className="mb-6 flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
        <MessageCircle className="h-5 w-5 text-slate-500" aria-hidden />
        Komentari {comments.length > 0 && `(${comments.length})`}
      </div>
      {user ? (
        <div className="mb-8 space-y-4">
          <Textarea
            placeholder="Napišite komentar..."
            value={newComment}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            maxLength={2000}
            className="resize-y"
          />
          <Button onClick={onSubmit} disabled={submitting || !newComment.trim()}>
            {submitting ? 'Slanje…' : 'Pošalji komentar'}
          </Button>
        </div>
      ) : (
        <div className="py-4 text-slate-600">
          <Link to="/login" state={{ from: `/blog/${slug}` }}>
            <Button variant="outline" size="sm">
              Prijavite se da biste komentarisali
            </Button>
          </Link>
        </div>
      )}
      {loading ? (
        <div className="py-8 text-center text-slate-600">Učitavanje…</div>
      ) : comments.length === 0 ? (
        <div className="italic text-slate-500">Nema odobrenih komentara.</div>
      ) : (
        <div className="space-y-6">
          {comments.map((c) => (
            <div key={c.id} className="border-b border-slate-100 py-4 last:border-b-0">
              <div className="mb-2 flex items-center gap-2">
                <div className="font-semibold text-slate-800">
                  {c.user.firstName} {c.user.lastName}
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(c.createdAt).toLocaleString('bs-BA')}
                </div>
              </div>
              <div className="whitespace-pre-wrap text-slate-700">{c.content}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
