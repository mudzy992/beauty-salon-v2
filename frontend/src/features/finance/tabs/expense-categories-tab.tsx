import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import api from '../../../api/client'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Switch } from '../../../components/ui/switch'
import { Textarea } from '../../../components/ui/textarea'
import { useAppToast } from '../../../lib/toast/useAppToast'
import type { ExpenseCategory, ExpenseTemplate } from '../finance.types'

export function ExpenseCategoriesTab() {
  const { t } = useTranslation()
  const { success, warning, toastApiError } = useAppToast()

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [isCatOpen, setIsCatOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    templateId: '',
    isActive: true,
    isFixed: false,
  })

  const [isTplOpen, setIsTplOpen] = useState(false)
  const [tplEditId, setTplEditId] = useState<string | null>(null)
  const [tplForm, setTplForm] = useState({
    name: '',
    description: '',
    requiresAttachmentPerItem: false,
  })
  const [newField, setNewField] = useState({ fieldName: '', defaultValue: '' })

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<ExpenseCategory[]>('/api/expense-categories'),
      api.get<ExpenseTemplate[]>('/api/expense-templates').then(async (r) => {
        const list = Array.isArray(r.data) ? r.data : []
        return Promise.all(
          list.map((tpl) =>
            api
              .get<ExpenseTemplate>(`/api/expense-templates/${tpl.id}`)
              .then((res) => res.data)
              .catch(() => tpl),
          ),
        )
      }),
    ])
      .then(([catRes, tpls]) => {
        setCategories(Array.isArray(catRes.data) ? catRes.data : [])
        setTemplates(tpls)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCatForm = (cat?: ExpenseCategory) => {
    if (cat) {
      setEditId(cat.id)
      setForm({
        name: cat.name,
        description: cat.description ?? '',
        templateId: cat.templateId ?? '',
        isActive: cat.isActive,
        isFixed: cat.isFixed ?? false,
      })
    } else {
      setEditId(null)
      setForm({ name: '', description: '', templateId: '', isActive: true, isFixed: false })
    }
    setIsCatOpen(true)
  }

  const handleSaveCat = async () => {
    if (!form.name) {
      warning('Unesite naziv')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        isActive: form.isActive,
        isFixed: form.isFixed,
      }
      if (form.templateId) payload.templateId = form.templateId
      if (editId) {
        await api.patch(`/api/expense-categories/${editId}`, payload)
      } else {
        if (!form.templateId) {
          warning('Odaberite šablon')
          setSaving(false)
          return
        }
        await api.post('/api/expense-categories', payload)
      }
      success('Sačuvano')
      loadData()
      setIsCatOpen(false)
    } catch (err) {
      toastApiError(err, 'Greška')
    } finally {
      setSaving(false)
    }
  }

  const openTplForm = (tpl?: ExpenseTemplate) => {
    if (tpl) {
      setTplEditId(tpl.id)
      setTplForm({
        name: tpl.name,
        description: tpl.description ?? '',
        requiresAttachmentPerItem: tpl.requiresAttachmentPerItem,
      })
    } else {
      setTplEditId(null)
      setTplForm({ name: '', description: '', requiresAttachmentPerItem: false })
    }
    setIsTplOpen(true)
  }

  const handleSaveTpl = async () => {
    if (!tplForm.name) {
      warning('Unesite naziv šablona')
      return
    }
    setSaving(true)
    try {
      if (tplEditId) await api.patch(`/api/expense-templates/${tplEditId}`, tplForm)
      else await api.post('/api/expense-templates', tplForm)
      success('Šablon sačuvan')
      loadData()
      setIsTplOpen(false)
    } catch (err) {
      toastApiError(err, 'Greška')
    } finally {
      setSaving(false)
    }
  }

  const handleAddField = async (templateId: string) => {
    if (!newField.fieldName) {
      warning('Unesite naziv stavke')
      return
    }
    try {
      await api.post(`/api/expense-templates/${templateId}/fields`, {
        fieldName: newField.fieldName,
        fieldType: 'CURRENCY',
        isRequired: true,
        sortOrder: 0,
        defaultValue: newField.defaultValue || undefined,
      })
      success('Stavka dodana')
      setNewField({ fieldName: '', defaultValue: '' })
      loadData()
    } catch (err) {
      toastApiError(err, 'Greška')
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!window.confirm('Obrisati stavku?')) return
    try {
      await api.delete(`/api/expense-templates/fields/${fieldId}`)
      loadData()
    } catch (err) {
      toastApiError(err, 'Greška')
    }
  }

  const templatesById = useMemo(() => new Map(templates.map((tpl) => [tpl.id, tpl])), [templates])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-600 dark:text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={() => openCatForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Kategorija
        </Button>
        <Button variant="outline" onClick={() => openTplForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Novi Šablon
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kategorije rashoda</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="p-3">Naziv</th>
                <th className="p-3">Šablon</th>
                <th className="p-3">Tip</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500 dark:text-slate-400" colSpan={5}>
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/80">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.template?.name ?? templatesById.get(c.templateId)?.name ?? '-'}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{c.isFixed ? 'Fiksno (Doprinosi)' : 'Varijabilno (Fakture)'}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className={
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200'
                        }
                      >
                        {c.isActive ? 'Aktivna' : 'Neaktivna'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openCatForm(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Šabloni</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('common.noData')}</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {templates.map((tpl) => (
                <AccordionItem key={tpl.id} value={tpl.id} className="rounded-md border border-slate-200 px-3 dark:border-slate-800">
                  <AccordionTrigger className="py-3 no-underline hover:no-underline">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pr-2">
                      <div className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{tpl.name}</div>
                      <Badge variant="secondary">{tpl.requiresAttachmentPerItem ? 'Prilog po stavci' : 'Prilog na rashod'}</Badge>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                        {(tpl.fields ?? []).length} stavki
                      </Badge>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openTplForm(tpl)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {tpl.requiresAttachmentPerItem ? (
                      <div className="space-y-4">
                        {(tpl.fields ?? []).length > 0 ? (
                          <Card>
                            <CardContent className="overflow-x-auto pt-6">
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                    <th className="p-3">Naziv stavke</th>
                                    <th className="p-3 text-right">Default cijena (KM)</th>
                                    <th className="p-3 text-right">Akcije</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(tpl.fields ?? []).map((f) => (
                                    <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800/80">
                                      <td className="p-3 font-medium">{f.fieldName}</td>
                                      <td className="p-3 text-right">{f.defaultValue ? Number(f.defaultValue).toFixed(2) : '-'}</td>
                                      <td className="p-3 text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20"
                                          onClick={() => void handleDeleteField(f.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="text-sm text-slate-500 dark:text-slate-400">Nema stavki.</div>
                        )}

                        <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Dodaj stavku</div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                            <div className="space-y-2">
                              <Label>Naziv (npr. PIO)</Label>
                              <Input
                                value={newField.fieldName}
                                onChange={(e) => setNewField((p) => ({ ...p, fieldName: e.target.value }))}
                                placeholder="PIO, Zdravstvo..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Default cijena</Label>
                              <Input
                                type="number"
                                value={newField.defaultValue}
                                onChange={(e) => setNewField((p) => ({ ...p, defaultValue: e.target.value }))}
                                placeholder="50.00"
                              />
                            </div>
                            <Button onClick={() => void handleAddField(tpl.id)}>Dodaj</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Ovaj šablon je za fakture — stavke se dodaju ručno prilikom kreiranja rashoda (naziv, količina, cijena). Prilog
                        (skenirana faktura) ide na kompletan rashod.
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? 'Uredi Kategoriju' : 'Nova Kategorija'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Naziv</Label>
              <Input id="catName" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catDesc">Opis</Label>
              <Textarea
                id="catDesc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catTpl">Šablon</Label>
              <select
                id="catTpl"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:ring-offset-slate-950"
                value={form.templateId}
                onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
                disabled={Boolean(editId)}
              >
                <option value="">{editId ? '—' : 'Odaberite šablon'}</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.requiresAttachmentPerItem ? '(Doprinosi)' : '(Fakture)'}
                  </option>
                ))}
              </select>
              {!editId ? <div className="text-xs text-slate-500 dark:text-slate-400">Šablon je obavezan kod kreiranja.</div> : null}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">Fiksno</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Doprinosi — unaprijed definirane stavke</div>
              </div>
              <Switch checked={form.isFixed} onCheckedChange={(v) => setForm((p) => ({ ...p, isFixed: v }))} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">Aktivna</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Prikazuje se kod kreiranja rashoda</div>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCatOpen(false)}>
              Odustani
            </Button>
            <Button onClick={() => void handleSaveCat()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sačuvaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTplOpen} onOpenChange={setIsTplOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{tplEditId ? 'Uredi Šablon' : 'Novi Šablon'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tplName">Naziv šablona</Label>
              <Input
                id="tplName"
                value={tplForm.name}
                onChange={(e) => setTplForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Doprinosi, Faktura materijala..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tplDesc">Opis</Label>
              <Textarea
                id="tplDesc"
                value={tplForm.description}
                onChange={(e) => setTplForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">Prilog po stavci</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Prilog uz svaku stavku (npr. uplatnice) — radi i za varijabilne rashode tipa “Ostalo”
                </div>
              </div>
              <Switch
                checked={tplForm.requiresAttachmentPerItem}
                onCheckedChange={(v) => setTplForm((p) => ({ ...p, requiresAttachmentPerItem: v }))}
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              {tplForm.requiresAttachmentPerItem
                ? 'DA — Prilog po stavci: uz svaku stavku možete dodati prilog (korisno za doprinose, ali i za varijabilne rashode npr. “Ostalo”).'
                : 'NE — Šablon za fakture: stavke se dodaju ručno (naziv, količina, cijena). Prilog ide na kompletan rashod.'}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTplOpen(false)}>
              Odustani
            </Button>
            <Button onClick={() => void handleSaveTpl()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sačuvaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

