import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { ConfirmDialog } from '../components/confirm-dialog'
import { EmptyState, ErrorState, TableSkeleton } from '../components/data-state'
import { CategoryDialog, type CategoryFormPayload } from './category-dialog'
import { TemplateDialog, type TemplateFormPayload } from './template-dialog'
import { TemplateFieldsEditor } from './template-fields-editor'
import {
  useExpenseCatalogMutations,
  useExpenseCategories,
  useExpenseTemplates,
} from '../hooks/use-expense-catalog'
import { useAppToast } from '../../../lib/toast/useAppToast'
import type { ExpenseCategory, ExpenseTemplate, TemplateFieldPayload } from '../finance.types'

export function ExpenseCategoriesTab() {
  const { success, toastApiError } = useAppToast()
  const categoriesQuery = useExpenseCategories()
  const templatesQuery = useExpenseTemplates()
  const mutations = useExpenseCatalogMutations()

  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean
    editing: ExpenseCategory | null
  }>({ open: false, editing: null })
  const [templateDialog, setTemplateDialog] = useState<{
    open: boolean
    editing: ExpenseTemplate | null
  }>({ open: false, editing: null })
  const [pendingFieldRemoval, setPendingFieldRemoval] = useState<string | null>(null)

  const handleSaveCategory = async (payload: CategoryFormPayload) => {
    try {
      await mutations.saveCategory.mutateAsync({
        id: categoryDialog.editing?.id,
        payload,
      })
      success('Kategorija je sačuvana.')
      setCategoryDialog({ open: false, editing: null })
    } catch (err) {
      toastApiError(err, 'Čuvanje kategorije nije uspjelo')
    }
  }

  const handleSaveTemplate = async (payload: TemplateFormPayload) => {
    try {
      await mutations.saveTemplate.mutateAsync({
        id: templateDialog.editing?.id,
        payload,
      })
      success('Predložak je sačuvan.')
      setTemplateDialog({ open: false, editing: null })
    } catch (err) {
      toastApiError(err, 'Čuvanje predloška nije uspjelo')
    }
  }

  const handleAddField = async (templateId: string, payload: TemplateFieldPayload) => {
    try {
      await mutations.addField.mutateAsync({ templateId, payload })
      success('Polje je dodano.')
    } catch (err) {
      toastApiError(err, 'Dodavanje polja nije uspjelo')
    }
  }

  const handleRemoveField = async () => {
    if (!pendingFieldRemoval) return
    try {
      await mutations.removeField.mutateAsync(pendingFieldRemoval)
      success('Polje je obrisano.')
    } catch (err) {
      toastApiError(err, 'Brisanje polja nije uspjelo')
    } finally {
      setPendingFieldRemoval(null)
    }
  }

  const categories = categoriesQuery.data ?? []
  const templates = templatesQuery.data ?? []

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Kategorije rashoda</CardTitle>
          <Button size="sm" onClick={() => setCategoryDialog({ open: true, editing: null })}>
            <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Nova kategorija
          </Button>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isLoading ? (
            <TableSkeleton rows={3} columns={3} />
          ) : categoriesQuery.isError ? (
            <ErrorState onRetry={() => void categoriesQuery.refetch()} />
          ) : categories.length === 0 ? (
            <EmptyState title="Nema kategorija" description="Dodajte prvu kategoriju rashoda." />
          ) : (
            <ul className="grid gap-2">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {category.name}
                      </span>
                      {!category.isActive ? <Badge variant="outline">neaktivna</Badge> : null}
                      {category.isFixed ? <Badge variant="secondary">fiksni</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Predložak: {category.template?.name ?? '—'} ·{' '}
                      {category.template?.fields?.length ?? 0} polja
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Uredi kategoriju ${category.name}`}
                    onClick={() => setCategoryDialog({ open: true, editing: category })}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Predlošci</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTemplateDialog({ open: true, editing: null })}
          >
            <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Novi predložak
          </Button>
        </CardHeader>
        <CardContent>
          {templatesQuery.isLoading ? (
            <TableSkeleton rows={3} columns={3} />
          ) : templatesQuery.isError ? (
            <ErrorState onRetry={() => void templatesQuery.refetch()} />
          ) : templates.length === 0 ? (
            <EmptyState title="Nema predložaka" />
          ) : (
            <ul className="grid gap-4">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {template.name}
                      </span>
                      {template.description ? (
                        <p className="text-xs text-slate-500">{template.description}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Uredi predložak ${template.name}`}
                      onClick={() => setTemplateDialog({ open: true, editing: template })}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                  <TemplateFieldsEditor
                    template={template}
                    isPending={mutations.addField.isPending || mutations.removeField.isPending}
                    onAdd={(payload) => void handleAddField(template.id, payload)}
                    onRemove={setPendingFieldRemoval}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog({ open, editing: open ? categoryDialog.editing : null })}
        editing={categoryDialog.editing}
        templates={templates}
        isSaving={mutations.saveCategory.isPending}
        onSubmit={(payload) => void handleSaveCategory(payload)}
      />

      <TemplateDialog
        open={templateDialog.open}
        onOpenChange={(open) => setTemplateDialog({ open, editing: open ? templateDialog.editing : null })}
        editing={templateDialog.editing}
        isSaving={mutations.saveTemplate.isPending}
        onSubmit={(payload) => void handleSaveTemplate(payload)}
      />

      <ConfirmDialog
        open={Boolean(pendingFieldRemoval)}
        onOpenChange={(open) => !open && setPendingFieldRemoval(null)}
        title="Obrisati polje?"
        description="Polje koje se već koristi na rashodima nije moguće obrisati."
        confirmLabel="Obriši"
        isDestructive
        isPending={mutations.removeField.isPending}
        onConfirm={() => void handleRemoveField()}
      />
    </div>
  )
}
