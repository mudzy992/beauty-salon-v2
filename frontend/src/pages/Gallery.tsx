import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'

import api from '../api/client'
import { MediaImage } from '../components/media-image'
import { getUploadUrl } from '../utils/uploadUrl'
import { useAppToast } from '../lib/toast/useAppToast'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

interface GalleryImage {
  id: string
  title: string | null
  description: string | null
  sortOrder: number
  uploadId: string
  upload?: { pathOriginal: string; pathThumb: string; pathMedium: string }
}

interface GalleryCategory {
  id: string
  name: string
  description: string | null
  sortOrder: number
  _count?: { images: number }
  images?: GalleryImage[]
}

export default function Gallery() {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()

  const [categories, setCategories] = useState<GalleryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [catImages, setCatImages] = useState<GalleryImage[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)

  const [catOpen, setCatOpen] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({ name: '', description: '', sortOrder: 0 })

  const [imgOpen, setImgOpen] = useState(false)
  const [editImgId, setEditImgId] = useState<string | null>(null)
  const [imgForm, setImgForm] = useState({ title: '', description: '', sortOrder: 0 })

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadCategories = useCallback(() => {
    setLoading(true)
    api
      .get<GalleryCategory[]>('/api/gallery/categories')
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const loadImages = useCallback(async (catId: string) => {
    setSelectedCatId(catId)
    setImagesLoading(true)
    try {
      const { data } = await api.get<GalleryCategory>(`/api/gallery/categories/${catId}`)
      setCatImages(data.images ?? [])
    } catch {
      setCatImages([])
    } finally {
      setImagesLoading(false)
    }
  }, [])

  const openCatForm = (c?: GalleryCategory) => {
    if (c) {
      setEditCatId(c.id)
      setCatForm({ name: c.name, description: c.description ?? '', sortOrder: c.sortOrder })
    } else {
      setEditCatId(null)
      setCatForm({ name: '', description: '', sortOrder: 0 })
    }
    setCatOpen(true)
  }

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) {
      warning('Unesite naziv kategorije')
      return
    }
    setSaving(true)
    try {
      if (editCatId) await api.patch(`/api/gallery/categories/${editCatId}`, catForm)
      else await api.post('/api/gallery/categories', catForm)
      success('Sačuvano')
      loadCategories()
      setCatOpen(false)
    } catch {
      error('Greška')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCat = async (id: string) => {
    if (!window.confirm('Obrisati kategoriju i sve slike?')) return
    try {
      await api.delete(`/api/gallery/categories/${id}`)
      success('Kategorija obrisana')
      if (selectedCatId === id) {
        setSelectedCatId(null)
        setCatImages([])
      }
      loadCategories()
    } catch {
      error('Greška')
    }
  }

  const handleUploadImage = async (file: File) => {
    if (!selectedCatId) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entity', 'gallery')
      const { data: upload } = await api.post('/api/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await api.post('/api/gallery/images', {
        categoryId: selectedCatId,
        uploadId: upload.id,
        title: file.name.replace(/\.[^.]+$/, ''),
        sortOrder: catImages.length,
      })
      success('Slika uploadovana')
      await loadImages(selectedCatId)
      loadCategories()
    } catch {
      error('Greška pri uploadu')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openImgEdit = (img: GalleryImage) => {
    setEditImgId(img.id)
    setImgForm({ title: img.title ?? '', description: img.description ?? '', sortOrder: img.sortOrder })
    setImgOpen(true)
  }

  const handleSaveImg = async () => {
    if (!editImgId) return
    setSaving(true)
    try {
      await api.patch(`/api/gallery/images/${editImgId}`, imgForm)
      success('Sačuvano')
      if (selectedCatId) await loadImages(selectedCatId)
      setImgOpen(false)
    } catch {
      error('Greška')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteImg = async (id: string) => {
    if (!window.confirm('Obrisati sliku?')) return
    try {
      await api.delete(`/api/gallery/images/${id}`)
      success('Slika obrisana')
      if (selectedCatId) await loadImages(selectedCatId)
      loadCategories()
    } catch {
      error('Greška')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-10 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.gallery')}</h1>
        <Button type="button" onClick={() => openCatForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Kategorija
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-[300px] lg:min-w-[280px]">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => (
                <Card
                  key={c.id}
                  className={[
                    'cursor-pointer p-4 transition-shadow hover:shadow-md',
                    selectedCatId === c.id ? 'border-brand-gold/60 bg-brand-champagne/10' : '',
                  ].join(' ')}
                  onClick={() => void loadImages(c.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-50">{c.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {c._count?.images ?? 0} slika | Redoslijed: {c.sortOrder}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Uredi" onClick={() => openCatForm(c)}>
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Obriši" onClick={() => void handleDeleteCat(c.id)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          {!selectedCatId ? (
            <Card className="p-6">
              <p className="text-sm text-slate-500">Odaberite kategoriju da upravljate slikama.</p>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {catImages.length} slika
                  </Badge>
                  {imagesLoading ? <span className="text-xs text-slate-500">Učitavam…</span> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleUploadImage(file)
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload sliku
                  </Button>
                </div>
              </div>

              {imagesLoading ? (
                <div className="flex justify-center py-10 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                </div>
              ) : catImages.length === 0 ? (
                <p className="text-sm text-slate-500">{t('common.noData')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catImages.map((img) => {
                    const src =
                      img.upload?.pathMedium || img.upload?.pathThumb || img.upload?.pathOriginal
                        ? getUploadUrl(img.upload?.pathMedium || img.upload?.pathThumb || img.upload?.pathOriginal)
                        : undefined
                    return (
                      <div key={img.id} className="group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="relative aspect-[4/3] bg-slate-50 dark:bg-slate-900/40">
                          <MediaImage src={src} alt={img.title ?? 'Gallery'} className="h-full w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/40 p-2 opacity-100">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-white">{img.title ?? 'Bez naslova'}</p>
                              <p className="truncate text-[10px] text-white/80">Redoslijed: {img.sortOrder}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" aria-label="Uredi" onClick={() => openImgEdit(img)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" aria-label="Obriši" onClick={() => void handleDeleteImg(img.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCatId ? 'Uredi kategoriju' : 'Nova kategorija'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Naziv</Label>
              <Input className="mt-1" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea className="mt-1" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Redoslijed</Label>
              <Input className="mt-1" type="number" min={0} value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setCatOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSaveCat()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Uredi sliku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Naslov</Label>
              <Input className="mt-1" value={imgForm.title} onChange={(e) => setImgForm({ ...imgForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea className="mt-1" value={imgForm.description} onChange={(e) => setImgForm({ ...imgForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Redoslijed</Label>
              <Input className="mt-1" type="number" min={0} value={imgForm.sortOrder} onChange={(e) => setImgForm({ ...imgForm, sortOrder: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setImgOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSaveImg()} disabled={saving || !editImgId}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

