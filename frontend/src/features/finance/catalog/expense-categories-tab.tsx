import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Wrench } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { ConfirmDialog } from '../components/confirm-dialog'
import { EmptyState, ErrorState, TableSkeleton } from '../components/data-state'
import {
  CategoryWizardDialog,
  type CategoryWizardSubmit,
} from './category-wizard-dialog'
import {
  useExpenseCatalogMutations,
  useExpenseCategories,
} from '../hooks/use-expense-catalog'
import { useAppToast } from '../../../lib/toast/useAppToast'
import type {
  ExpenseCategory,
  ExpenseLineRole,
  TemplateFieldPayload,
} from '../finance.types'

const LINE_ROLE_KEYS: Record<ExpenseLineRole, string> = {
  LABEL: 'finance.expenseCategories.roles.label',
  QTY: 'finance.expenseCategories.roles.quantity',
  UNIT_PRICE: 'finance.expenseCategories.roles.unitPrice',
  AMOUNT: 'finance.expenseCategories.roles.amount',
  NONE: 'finance.expenseCategories.roles.none',
}

export function ExpenseCategoriesTab() {
  const { t } = useTranslation()
  const { success, toastApiError } = useAppToast()
  const categoriesQuery = useExpenseCategories()
  const mutations = useExpenseCatalogMutations()

  const [wizard, setWizard] = useState<{
    open: boolean
    editing: ExpenseCategory | null
  }>({ open: false, editing: null })
  const [pendingFieldRemoval, setPendingFieldRemoval] = useState<string | null>(
    null,
  )
  const lineRoleLabel = (lineRole: string) => {
    const key = LINE_ROLE_KEYS[lineRole as ExpenseLineRole]
    return key ? t(key) : lineRole
  }

  const handleSubmit = async (submit: CategoryWizardSubmit) => {
    try {
      if (submit.mode === 'create') {
        await mutations.createBundle.mutateAsync(submit.payload)
      } else {
        await mutations.updateBundle.mutateAsync({
          categoryId: submit.categoryId,
          templateId: submit.templateId,
          payload: submit.payload,
        })
      }
      success(t('finance.expenseCategories.categorySaved'))
      setWizard({ open: false, editing: null })
    } catch (err) {
      toastApiError(err, t('finance.expenseCategories.categorySaveFailed'))
    }
  }

  const handleAddField = async (
    templateId: string,
    payload: TemplateFieldPayload,
  ) => {
    try {
      await mutations.addField.mutateAsync({ templateId, payload })
      success(t('finance.expenseCategories.fieldAdded'))
    } catch (err) {
      toastApiError(err, t('finance.expenseCategories.fieldAddFailed'))
    }
  }

  const handleRemoveField = async () => {
    if (!pendingFieldRemoval) return
    try {
      await mutations.removeField.mutateAsync(pendingFieldRemoval)
      success(t('finance.expenseCategories.fieldDeleted'))
    } catch (err) {
      toastApiError(err, t('finance.expenseCategories.fieldDeleteFailed'))
    } finally {
      setPendingFieldRemoval(null)
    }
  }

  const handleBootstrap = async () => {
    try {
      const result = await mutations.bootstrapLegacy.mutateAsync()
      const names = result.bootstrapped
      success(
        names.length
          ? t('finance.expenseCategories.bootstrapAdded', {
              names: names.join(', '),
            })
          : t('finance.expenseCategories.bootstrapEmpty'),
      )
    } catch (err) {
      toastApiError(err, t('finance.expenseCategories.bootstrapFailed'))
    }
  }

  const categories = categoriesQuery.data ?? []

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">
              {t('finance.expenseCategories.title')}
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              {t('finance.expenseCategories.subtitle')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleBootstrap()}
              disabled={mutations.bootstrapLegacy.isPending}
            >
              <Wrench className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              {t('finance.expenseCategories.fillLegacy')}
            </Button>
            <Button
              size="sm"
              onClick={() => setWizard({ open: true, editing: null })}
            >
              <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              {t('finance.expenseCategories.createCategory')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isLoading ? (
            <TableSkeleton rows={3} columns={3} />
          ) : categoriesQuery.isError ? (
            <ErrorState onRetry={() => void categoriesQuery.refetch()} />
          ) : categories.length === 0 ? (
            <EmptyState
              title={t('finance.expenseCategories.emptyTitle')}
              description={t('finance.expenseCategories.emptyDescription')}
            />
          ) : (
            <ul className="grid gap-3">
              {categories.map((category) => {
                const fields = [...(category.template?.fields ?? [])].sort(
                  (a, b) => a.sortOrder - b.sortOrder,
                )
                return (
                  <li
                    key={category.id}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-slate-50">
                            {category.name}
                          </span>
                          {!category.isActive ? (
                            <Badge variant="outline">
                              {t('finance.expenseCategories.inactive')}
                            </Badge>
                          ) : null}
                          <Badge variant="secondary">
                            {t(
                              category.isFixed
                                ? 'finance.expenseCategories.fixedItems'
                                : 'finance.expenseCategories.variableRows',
                            )}
                          </Badge>
                          {category.template?.requiresAttachmentPerItem ? (
                            <Badge variant="outline">
                              {t('finance.expenseCategories.attachmentPerItem')}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {t(
                                'finance.expenseCategories.attachmentForExpense',
                              )}
                            </Badge>
                          )}
                        </div>
                        {category.description ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {category.description}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-500">
                          {fields.length === 0
                            ? t('finance.expenseCategories.noFieldsHint')
                            : fields
                                .map((f) =>
                                  category.isFixed
                                    ? f.fieldName
                                    : `${f.fieldName}${f.lineRole && f.lineRole !== 'NONE' ? ` (${lineRoleLabel(f.lineRole)})` : ''}`,
                                )
                                .join(' · ')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t(
                          'finance.expenseCategories.editCategory',
                          {
                            name: category.name,
                          },
                        )}
                        onClick={() =>
                          setWizard({ open: true, editing: category })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <CategoryWizardDialog
        open={wizard.open}
        onOpenChange={(open) =>
          setWizard({ open, editing: open ? wizard.editing : null })
        }
        editing={wizard.editing}
        isSaving={
          mutations.createBundle.isPending || mutations.updateBundle.isPending
        }
        isFieldPending={
          mutations.addField.isPending || mutations.removeField.isPending
        }
        onSubmit={(submit) => void handleSubmit(submit)}
        onAddField={(templateId, payload) =>
          void handleAddField(templateId, payload)
        }
        onRemoveField={setPendingFieldRemoval}
      />

      <ConfirmDialog
        open={Boolean(pendingFieldRemoval)}
        onOpenChange={(open) => !open && setPendingFieldRemoval(null)}
        title={t('finance.expenseCategories.deleteFieldTitle')}
        description={t('finance.expenseCategories.deleteFieldDescription')}
        confirmLabel={t('finance.expenseCategories.deleteFieldConfirm')}
        isDestructive
        isPending={mutations.removeField.isPending}
        onConfirm={() => void handleRemoveField()}
      />
    </div>
  )
}
