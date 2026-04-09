import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Eye, FileText, Loader2, Lock, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import api from '../../../api/client'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { getUploadUrl } from '../../../utils/uploadUrl'
import { MONTHS, formatDateBs, getEndOfMonthDate } from '../finance.utils'
import type { Expense, ExpenseBook, ExpenseCategory } from '../finance.types'

type LineItem = { name: string; qty: number; price: number }
type ExpenseBookDetail = ExpenseBook & { expenses?: Expense[] }

export function ExpenseBooksTab() {
  const { t } = useTranslation()
  const { success, warning, toastApiError } = useAppToast()

  const [books, setBooks] = useState<ExpenseBook[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBook, setSelectedBook] = useState<ExpenseBookDetail | null>(null)
  const [bookExpenses, setBookExpenses] = useState<Expense[]>([])
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [view, setView] = useState<'list' | 'book' | 'expense'>('list')

  const nowForPicker = useRef<Date>(new Date())
  const [targetYear, setTargetYear] = useState<number>(nowForPicker.current.getFullYear())
  const [targetMonth, setTargetMonth] = useState<number>(nowForPicker.current.getMonth() + 1)

  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [locking, setLocking] = useState(false)

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [saving, setSaving] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [form, setForm] = useState({ categoryId: '', title: '', notes: '' })
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null)
  const [fixedFields, setFixedFields] = useState<
    { fieldId: string; fieldName: string; value: string; attachmentId: string; attachmentName: string }[]
  >([])
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [attachmentUploadIds, setAttachmentUploadIds] = useState<string[]>([])
  const [attachmentNames, setAttachmentNames] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const fixedFileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [uploadingAtt, setUploadingAtt] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    api
      .get<ExpenseBook[]>('/api/expense-books')
      .then((r) => setBooks(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    api
      .get<ExpenseCategory[]>('/api/expense-categories')
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [])

  const openMonth = async (year: number, month: number) => {
    try {
      const { data } = await api.get<ExpenseBookDetail>(`/api/expense-books/month/${year}/${month}`)
      setSelectedBook(data)
      setBookExpenses(Array.isArray((data as any)?.expenses) ? (data as any).expenses : [])
      setView('book')
      loadData()
    } catch (err) {
      toastApiError(err, 'Greška')
    }
  }

  const openBook = async (b: ExpenseBook) => {
    try {
      const { data } = await api.get<ExpenseBookDetail>(`/api/expense-books/${b.id}`)
      setSelectedBook(data)
      setBookExpenses(Array.isArray((data as any)?.expenses) ? (data as any).expenses : [])
    } catch {
      setSelectedBook(b as ExpenseBookDetail)
      setBookExpenses([])
    }
    setView('book')
  }

  const reloadSelectedBook = async () => {
    if (!selectedBook) return
    try {
      const { data } = await api.get<ExpenseBookDetail>(`/api/expense-books/${selectedBook.id}`)
      setSelectedBook(data)
      setBookExpenses(Array.isArray((data as any)?.expenses) ? (data as any).expenses : [])
      loadData()
    } catch {}
  }

  const openExpenseDetail = async (exp: Expense) => {
    try {
      const { data } = await api.get<Expense>(`/api/expenses/${exp.id}`)
      setSelectedExpense(data)
    } catch {
      setSelectedExpense(exp)
    }
    setView('expense')
  }

  const openCurrentMonth = async () => {
    const now = new Date()
    await openMonth(now.getFullYear(), now.getMonth() + 1)
  }

  const handleUnlockBook = async () => {
    if (!selectedBook) return
    const reason = unlockReason.trim()
    if (!reason) {
      warning('Unesite razlog otključavanja')
      return
    }
    setUnlocking(true)
    try {
      await api.post(`/api/expense-books/${selectedBook.id}/unlock`, { reason })
      success('Knjiga otključana')
      setUnlockReason('')
      setIsUnlockOpen(false)
      await reloadSelectedBook()
    } catch (err) {
      toastApiError(err, 'Greška')
    } finally {
      setUnlocking(false)
    }
  }

  const handleLockBook = async (id: string) => {
    setLocking(true)
    try {
      await api.post(`/api/expense-books/${id}/lock`)
      success('Knjiga zaključana')
      await reloadSelectedBook()
    } catch (err) {
      toastApiError(err, 'Greška')
    } finally {
      setLocking(false)
    }
  }

  const onCategoryChange = async (catId: string) => {
    setForm((prev) => ({ ...prev, categoryId: catId }))
    setSelectedCategory(null)
    setFixedFields([])
    setLineItems([])
    const cat = categories.find((c) => c.id === catId)
    if (!cat) return
    let fullCat = cat
    if (cat.templateId && (!cat.template?.fields || cat.template.fields.length === 0)) {
      try {
        const { data } = await api.get<ExpenseCategory>(`/api/expense-categories/${cat.id}`)
        fullCat = data
      } catch {}
    }
    setSelectedCategory(fullCat)
    if (fullCat.isFixed && fullCat.template?.fields) {
      setFixedFields(
        fullCat.template.fields.map((f) => ({
          fieldId: f.id,
          fieldName: f.fieldName,
          value: f.defaultValue ?? '',
          attachmentId: '',
          attachmentName: '',
        })),
      )
      setForm((prev) => ({ ...prev, title: fullCat.name }))
    } else {
      setLineItems([{ name: '', qty: 1, price: 0 }])
    }
  }

  const openCreateExpense = () => {
    setForm({ categoryId: '', title: '', notes: '' })
    setSelectedCategory(null)
    setFixedFields([])
    setLineItems([])
    setAttachmentUploadIds([])
    setAttachmentNames([])
    setIsCreateOpen(true)
  }

  const calcTotal = (): number => {
    if (selectedCategory?.isFixed) return fixedFields.reduce((sum, f) => sum + Number(f.value || 0), 0)
    return lineItems.reduce((sum, item) => sum + item.qty * item.price, 0)
  }

  const handleUploadAtt = async (file: File) => {
    setUploadingAtt(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('entity', 'expenses')
      const { data } = await api.post('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setAttachmentUploadIds((p) => [...p, data.id])
      setAttachmentNames((p) => [...p, file.name])
    } catch (err) {
      toastApiError(err, 'Greška pri uploadu')
    } finally {
      setUploadingAtt(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleUploadFixedAtt = async (file: File, fieldId: string) => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('entity', 'expenses')
      const { data } = await api.post('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFixedFields((prev) =>
        prev.map((f) => (f.fieldId === fieldId ? { ...f, attachmentId: data.id, attachmentName: file.name } : f)),
      )
    } catch (err) {
      toastApiError(err, 'Greška pri uploadu')
    }
  }

  const handleSaveExpense = async () => {
    if (!selectedBook || !form.categoryId || !form.title) {
      warning('Popunite sva polja')
      return
    }
    setSaving(true)
    try {
      const totalAmount = calcTotal()
      const fieldValues: { fieldId: string; value: string }[] = []
      const allAttIds: string[] = [...attachmentUploadIds]
      if (selectedCategory?.isFixed) {
        fixedFields.forEach((f) => {
          fieldValues.push({ fieldId: f.fieldId, value: f.value })
          if (f.attachmentId) allAttIds.push(f.attachmentId)
        })
      }
      await api.post('/api/expenses', {
        bookId: selectedBook.id,
        categoryId: form.categoryId,
        title: form.title,
        totalAmount,
        notes: selectedCategory?.isFixed ? form.notes || undefined : JSON.stringify({ lineItems, userNotes: form.notes }),
        fieldValues: fieldValues.length > 0 ? fieldValues : undefined,
        attachmentUploadIds: allAttIds.length > 0 ? allAttIds : undefined,
      })
      success('Rashod sačuvan')
      setIsCreateOpen(false)
      await openBook(selectedBook)
    } catch (err) {
      toastApiError(err, 'Greška')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Obrisati rashod?')) return
    try {
      await api.delete(`/api/expenses/${id}`)
      success('Obrisano')
      if (selectedBook) await openBook(selectedBook)
    } catch (err) {
      toastApiError(err, 'Greška')
    }
  }

  const yearMonthLabel = useMemo(() => {
    if (!selectedBook) return ''
    return `${MONTHS[selectedBook.month]} ${selectedBook.year}`
  }, [selectedBook])

  useEffect(() => {
    if (view !== 'book' || !selectedBook) return
    const isUnlocked = !selectedBook.isClosed
    if (!isUnlocked) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [selectedBook, view])

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, i) => nowForPicker.current.getFullYear() - 2 + i),
    [],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-600 dark:text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentBook = books.find((b) => b.year === currentYear && b.month === currentMonth) ?? null
  const isCurrentBookOpen = Boolean(currentBook && !currentBook.isClosed)
  const currentMonthEnd = getEndOfMonthDate(currentYear, currentMonth)

  if (view === 'expense' && selectedExpense) {
    const isFixed = selectedExpense.category?.isFixed
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setView('book')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazad na knjigu
        </Button>

        <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Detalji rashoda: {selectedExpense.title}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pregled</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Naslov</div>
              <div className="font-medium text-slate-900 dark:text-slate-50">{selectedExpense.title}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Ukupni iznos</div>
              <div className="font-semibold text-rose-700 dark:text-rose-300">
                {Number(selectedExpense.totalAmount).toFixed(2)} KM
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Kategorija</div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="text-sm text-slate-900 dark:text-slate-50">{selectedExpense.category?.name ?? '-'}</div>
                {isFixed ? <Badge variant="secondary">FIKSNO</Badge> : null}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Datum</div>
              <div className="text-sm text-slate-900 dark:text-slate-50">
                {new Date(selectedExpense.createdAt).toLocaleDateString('bs-BA')}
              </div>
            </div>
            {selectedExpense.notes ? (
              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">Bilješke</div>
                <div className="text-sm text-slate-900 dark:text-slate-50">{selectedExpense.notes}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedExpense.fieldValues && selectedExpense.fieldValues.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stavke</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="p-3">Naziv</th>
                    <th className="p-3 text-right">Cijena (KM)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExpense.fieldValues.map((fv) => (
                    <tr key={fv.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="p-3 font-medium">{fv.field?.fieldName ?? '-'}</td>
                      <td className="p-3 text-right">{Number(fv.value || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}

        {selectedExpense.attachments && selectedExpense.attachments.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Prilozi ({selectedExpense.attachments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedExpense.attachments.map((att) => {
                const isImage = Boolean(att.upload?.originalName?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                const thumbUrl = att.upload?.pathThumb || att.upload?.pathOriginal
                const originalUrl = att.upload?.pathOriginal
                return (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/30"
                  >
                    {isImage && thumbUrl ? (
                      <img
                        src={getUploadUrl(thumbUrl)}
                        alt=""
                        className="h-12 w-12 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                        {att.upload?.originalName ?? 'Prilog'}
                      </div>
                    </div>

                    {originalUrl ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={getUploadUrl(originalUrl)} target="_blank" rel="noreferrer">
                          Preuzmi
                        </a>
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>
    )
  }

  if (view === 'book' && selectedBook) {
    const bookTotal = bookExpenses.reduce((s, e) => s + Number(e.totalAmount || 0), 0)
    const isLocked = Boolean(selectedBook.isClosed)
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => {
            if (!isLocked) {
              warning('Knjiga je otključana', 'Prije izlaska morate zaključati knjigu.')
              return
            }
            setView('list')
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazad na listu
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">Knjiga rashoda: {yearMonthLabel}</div>
            {isLocked ? (
              <Badge variant="secondary" className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                Zaključana
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                Otključana
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isLocked ? (
              <Button onClick={openCreateExpense}>
                <Plus className="mr-2 h-4 w-4" />
                Novi Rashod
              </Button>
            ) : null}
            {isLocked ? (
              <Button variant="outline" onClick={() => setIsUnlockOpen(true)}>
                Otključaj
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                onClick={() => void handleLockBook(selectedBook.id)}
                disabled={locking}
              >
                {locking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Zaključi
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Ukupni rashodi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-rose-700 dark:text-rose-300">{bookTotal.toFixed(2)} KM</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rashodi</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="p-3">Naslov</th>
                  <th className="p-3">Kategorija</th>
                  <th className="p-3">Tip</th>
                  <th className="p-3 text-right">Iznos (KM)</th>
                  <th className="p-3">Datum</th>
                  <th className="p-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {bookExpenses.length === 0 ? (
                  <tr>
                    <td className="p-3 text-slate-500 dark:text-slate-400" colSpan={6}>
                      Nema rashoda.
                    </td>
                  </tr>
                ) : (
                  bookExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                      onClick={() => void openExpenseDetail(exp)}
                    >
                      <td className="p-3 font-medium">{exp.title}</td>
                      <td className="p-3">{exp.category?.name ?? '-'}</td>
                      <td className="p-3">
                        <Badge variant="secondary">{exp.category?.isFixed ? 'Fiksno' : 'Faktura'}</Badge>
                      </td>
                      <td className="p-3 text-right font-semibold text-rose-700 dark:text-rose-300">
                        {Number(exp.totalAmount).toFixed(2)}
                      </td>
                      <td className="p-3">{new Date(exp.createdAt).toLocaleDateString('bs-BA')}</td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20"
                            onClick={() => void handleDeleteExpense(exp.id)}
                          disabled={isLocked}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col gap-4 overflow-hidden p-6 sm:rounded-lg">
            <DialogHeader className="shrink-0 pr-10 text-left">
              <DialogTitle>
                Novi Rashod — {MONTHS[selectedBook.month]} {selectedBook.year}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
              <div className="space-y-2">
                <Label htmlFor="category">Kategorija</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:ring-offset-slate-950"
                  value={form.categoryId}
                  onChange={(e) => void onCategoryChange(e.target.value)}
                >
                  <option value="" disabled>
                    Odaberite kategoriju
                  </option>
                  {categories
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.isFixed ? ' (Fiksno)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              {selectedCategory ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">Naslov</Label>
                    <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>

                  {selectedCategory.isFixed && fixedFields.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Fiksne stavke</div>
                      <div className="space-y-2">
                        {fixedFields.map((f) => (
                          <Card key={f.fieldId} className="border-slate-200 dark:border-slate-800">
                            <CardContent className="pt-6">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="font-medium text-slate-900 dark:text-slate-50">{f.fieldName}</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-500 dark:text-slate-400">Cijena:</span>
                                  <Input
                                    className="w-28 text-right"
                                    type="number"
                                    value={f.value}
                                    onChange={(e) =>
                                      setFixedFields((p) =>
                                        p.map((ff) => (ff.fieldId === f.fieldId ? { ...ff, value: e.target.value } : ff)),
                                      )
                                    }
                                  />
                                  <span className="text-sm text-slate-500 dark:text-slate-400">KM</span>
                                </div>
                              </div>

                              {selectedCategory.template?.requiresAttachmentPerItem ? (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Prilog:</div>
                                  {f.attachmentName ? (
                                    <Badge variant="secondary">{f.attachmentName}</Badge>
                                  ) : (
                                    <>
                                      <input
                                        type="file"
                                        ref={(el) => {
                                          fixedFileRefs.current[f.fieldId] = el
                                        }}
                                        className="hidden"
                                        onChange={(e) =>
                                          e.target.files?.[0] && void handleUploadFixedAtt(e.target.files[0], f.fieldId)
                                        }
                                      />
                                      <Button variant="outline" size="sm" onClick={() => fixedFileRefs.current[f.fieldId]?.click()}>
                                        Dodaj prilog
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Card className="bg-slate-50 dark:bg-slate-900/30">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-slate-900 dark:text-slate-50">UKUPNO:</div>
                            <div className="font-semibold text-rose-700 dark:text-rose-300">{calcTotal().toFixed(2)} KM</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}

                  {!selectedCategory.isFixed ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Stavke</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLineItems([...lineItems, { name: '', qty: 1, price: 0 }])}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Dodaj stavku
                        </Button>
                      </div>

                      <Card>
                        <CardContent className="overflow-x-auto pt-6">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <th className="p-3">Naziv</th>
                                <th className="p-3 text-right">Količina</th>
                                <th className="p-3 text-right">Cijena</th>
                                <th className="p-3 text-right">Ukupno</th>
                                <th className="p-3"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lineItems.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/80">
                                  <td className="p-3">
                                    <Input
                                      value={item.name}
                                      placeholder="Naziv"
                                      onChange={(e) => {
                                        const n = [...lineItems]
                                        n[idx] = { ...n[idx], name: e.target.value }
                                        setLineItems(n)
                                      }}
                                    />
                                  </td>
                                  <td className="p-3 text-right">
                                    <Input
                                      className="w-20 text-right"
                                      type="number"
                                      value={item.qty}
                                      min={1}
                                      onChange={(e) => {
                                        const n = [...lineItems]
                                        n[idx] = { ...n[idx], qty: Number(e.target.value) || 1 }
                                        setLineItems(n)
                                      }}
                                    />
                                  </td>
                                  <td className="p-3 text-right">
                                    <Input
                                      className="w-24 text-right"
                                      type="number"
                                      value={item.price}
                                      onChange={(e) => {
                                        const n = [...lineItems]
                                        n[idx] = { ...n[idx], price: Number(e.target.value) || 0 }
                                        setLineItems(n)
                                      }}
                                    />
                                  </td>
                                  <td className="p-3 text-right font-medium">{(item.qty * item.price).toFixed(2)}</td>
                                  <td className="p-3">
                                    {lineItems.length > 1 ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20"
                                        onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-50 dark:bg-slate-900/30">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-slate-900 dark:text-slate-50">UKUPNO:</div>
                            <div className="font-semibold text-rose-700 dark:text-rose-300">{calcTotal().toFixed(2)} KM</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Bilješke</Label>
                    <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                  </div>

                  {!selectedCategory.isFixed ? (
                    <div className="space-y-2">
                      <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />
                      <Label>Prilog (skenirana faktura)</Label>

                      {attachmentNames.map((name, i) => (
                        <div
                          key={`${name}-${i}`}
                          className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                        >
                          <div className="min-w-0 flex-1 truncate text-sm text-slate-900 dark:text-slate-50">{name}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20"
                            onClick={() => {
                              setAttachmentUploadIds((p) => p.filter((_, idx) => idx !== i))
                              setAttachmentNames((p) => p.filter((_, idx) => idx !== i))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      <input
                        type="file"
                        ref={fileRef}
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && void handleUploadAtt(e.target.files[0])}
                      />
                      <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadingAtt}>
                        {uploadingAtt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Dodaj prilog
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <DialogFooter className="shrink-0 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Odustani
              </Button>
              <Button onClick={() => void handleSaveExpense()} disabled={saving || !selectedCategory}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sačuvaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isUnlockOpen} onOpenChange={setIsUnlockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Otključaj knjigu</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="unlockReason">Razlog</Label>
              <Textarea id="unlockReason" value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} rows={3} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUnlockOpen(false)}>
                Odustani
              </Button>
              <Button onClick={() => void handleUnlockBook()} disabled={unlocking}>
                {unlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Otključaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isCurrentBookOpen ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Otvoreno</Badge>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Knjiga za tekući mjesec {MONTHS[currentMonth]} {currentYear} je otvorena do {formatDateBs(currentMonthEnd)}.
            </div>
          </div>
        ) : (
          <Button onClick={() => void openCurrentMonth()}>
            <Plus className="mr-2 h-4 w-4" />
            Otvori tekući mjesec
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={targetYear}
            onChange={(e) => setTargetYear(Number(e.target.value) || targetYear)}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={targetMonth}
            onChange={(e) => setTargetMonth(Number(e.target.value) || targetMonth)}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {MONTHS[m]}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => void openMonth(targetYear, targetMonth)}>
            Otvori
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="p-3">Godina</th>
                <th className="p-3">Mjesec</th>
                <th className="p-3">Otvorena</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500 dark:text-slate-400" colSpan={5}>
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                books.map((b) => (
                  <tr
                    key={b.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                    onClick={() => void openBook(b)}
                  >
                    <td className="p-3">{b.year}</td>
                    <td className="p-3">{MONTHS[b.month]}</td>
                    <td className="p-3">{new Date(b.openedAt).toLocaleDateString('bs-BA')}</td>
                    <td className="p-3">
                      <Badge
                        className={
                          b.isClosed
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                        }
                      >
                        {b.isClosed ? 'Zaključana' : 'Otključana'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

