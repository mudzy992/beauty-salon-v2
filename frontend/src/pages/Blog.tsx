import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, MessageSquareText, Pencil, Plus, Trash2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { useAppToast } from '../lib/toast/useAppToast'
import { getUploadUrl } from '../utils/uploadUrl'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Textarea } from '../components/ui/textarea'

interface BlogComment {
  id: string
  content: string
  isApproved: boolean
  createdAt: string
  user?: { username: string; firstName: string | null; lastName: string | null }
}

interface BlogPost {
  id: string
  title: string
  slug: string
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  content: string
  heroImage: string | null
}

export default function Blog() {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()

  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [heroImage, setHeroImage] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const heroFileRef = useRef<HTMLInputElement>(null)

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null)
  const [commentsPostTitle, setCommentsPostTitle] = useState('')
  const [comments, setComments] = useState<BlogComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    api
      .get<BlogPost[]>('/api/blog')
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUploadHero = async (file: File) => {
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('entity', 'blog')
      const { data } = await api.post('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setHeroImage(data.pathMedium || data.pathOriginal || '')
      success('Slika uploadovana')
    } catch (err) {
      error(getErrorMessage(err))
    } finally {
      setUploadingImg(false)
      if (heroFileRef.current) heroFileRef.current.value = ''
    }
  }

  const openForm = async (id?: string) => {
    if (id) {
      setEditId(id)
      try {
        const { data } = await api.get<BlogPost>(`/api/blog/${id}`)
        setTitle(data.title)
        setContent(data.content)
        setIsPublished(data.isPublished)
        setHeroImage(data.heroImage ?? '')
        setOpen(true)
      } catch (err) {
        error(getErrorMessage(err))
      }
      return
    }
    setEditId(null)
    setTitle('')
    setContent('')
    setIsPublished(false)
    setHeroImage('')
    setOpen(true)
  }

  const handleSave = async () => {
    if (!title || !content) {
      warning('Naslov i sadržaj su obavezni')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { title, content, isPublished }
      if (heroImage) payload.heroImage = heroImage
      if (editId) await api.patch(`/api/blog/${editId}`, payload)
      else await api.post('/api/blog', payload)
      success('Sačuvano')
      loadData()
      setOpen(false)
    } catch (err) {
      error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati članak?')) return
    try {
      await api.delete(`/api/blog/${id}`)
      success('Obrisano')
      loadData()
    } catch (err) {
      error(getErrorMessage(err))
    }
  }

  const openComments = async (postId: string, postTitle: string) => {
    setCommentsPostId(postId)
    setCommentsPostTitle(postTitle)
    setCommentsLoading(true)
    setCommentsOpen(true)
    try {
      const { data } = await api.get<BlogComment[]>(`/api/blog/${postId}/comments`)
      setComments(Array.isArray(data) ? data : [])
    } catch {
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  const handleApproveComment = async (commentId: string) => {
    try {
      await api.patch(`/api/blog/comments/${commentId}/approve`)
      success('Komentar odobren')
      if (commentsPostId) openComments(commentsPostId, commentsPostTitle)
    } catch (err) {
      error(getErrorMessage(err))
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Obrisati komentar?')) return
    try {
      await api.delete(`/api/blog/comments/${commentId}`)
      success('Komentar obrisan')
      if (commentsPostId) openComments(commentsPostId, commentsPostTitle)
    } catch (err) {
      error(getErrorMessage(err))
    }
  }

  const heroPreviewUrl = useMemo(() => (heroImage ? getUploadUrl(heroImage) : null), [heroImage])

  const commentAuthor = (u?: BlogComment['user']) => {
    if (!u) return 'Nepoznat'
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.blog')}</h1>
        <Button type="button" onClick={() => void openForm()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Novi članak
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
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
                    <td colSpan={6} className="p-6 text-slate-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  posts.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{p.title}</td>
                      <td className="p-3 text-slate-500">{p.slug}</td>
                      <td className="p-3">
                        <Badge variant={p.isPublished ? 'success' : 'secondary'}>{p.isPublished ? 'Objavljeno' : 'Nacrt'}</Badge>
                      </td>
                      <td className="p-3">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('bs-BA') : '-'}</td>
                      <td className="p-3">{new Date(p.createdAt).toLocaleDateString('bs-BA')}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label="Komentari"
                            onClick={() => void openComments(p.id, p.title)}
                          >
                            <MessageSquareText className="h-4 w-4 text-teal-600" aria-hidden="true" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Uredi" onClick={() => void openForm(p.id)}>
                            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Obriši" onClick={() => void handleDelete(p.id)}>
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
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? 'Uredi članak' : 'Novi članak'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Naslov</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Hero slika</Label>
              {heroPreviewUrl ? (
                <img src={heroPreviewUrl} alt="Hero" className="h-[150px] w-full rounded-md object-cover" />
              ) : null}
              <input
                type="file"
                accept="image/*"
                ref={heroFileRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleUploadHero(file)
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => heroFileRef.current?.click()} disabled={uploadingImg}>
                {uploadingImg ? 'Upload...' : heroImage ? 'Promijeni sliku' : 'Upload hero sliku'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Sadržaj (HTML/Tekst)</Label>
              <Textarea rows={12} value={content} onChange={(e) => setContent(e.target.value)} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Objavljeno</p>
                <p className="text-xs text-slate-500">Kada je uključeno, članak je vidljiv na javnoj stranici.</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={(checked) => setIsPublished(checked)} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Komentari: {commentsPostTitle}</DialogTitle>
          </DialogHeader>

          {commentsLoading ? (
            <div className="flex justify-center p-10 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-500">Nema komentara za ovaj članak.</p>
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
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{commentAuthor(c.user)}</p>
                        <Badge variant={c.isApproved ? 'success' : 'warning'}>{c.isApproved ? 'Odobren' : 'Na čekanju'}</Badge>
                      </div>
                      <p className="text-sm text-slate-900 dark:text-slate-50">{c.content}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(c.createdAt).toLocaleString('bs-BA')}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!c.isApproved ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Odobri"
                          onClick={() => void handleApproveComment(c.id)}
                        >
                          <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Obriši"
                        onClick={() => void handleDeleteComment(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setCommentsOpen(false)}>
              Zatvori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
