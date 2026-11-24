import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { ServiceTable } from './service-table'
import { disambiguatedName } from './service-catalog-names'
import type { Service } from './service-types'
import type { Subcategory } from './service-catalog-types'

type Props = {
  sub: Subcategory
  categoryId: string
  allSubcategories: Subcategory[]
  serviceAccessibleName: (service: Service) => string
  openSubcategoryForm: (categoryId: string, subcategory: Subcategory | undefined, opener: HTMLButtonElement) => void
  openServiceForm: (subcategoryId: string, service: Service | undefined, opener: HTMLButtonElement) => void
  handleDeleteSubcategory: (id: string, opener: HTMLButtonElement) => void
  openServiceDeletion: (service: Service, opener: HTMLButtonElement) => void
}
export function ServiceSubcategory({ sub, categoryId, allSubcategories, serviceAccessibleName, openSubcategoryForm, openServiceForm, handleDeleteSubcategory, openServiceDeletion }: Props) {
  const { t } = useTranslation()
  const name = disambiguatedName(sub, allSubcategories)
  return (
    <div className="rounded-md border-l-4 border-l-brand-gold bg-surface-muted p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-content">{sub.name}</p>
          <Badge variant={sub.isActive ? 'success' : 'secondary'} className="text-[10px]">
            {sub.isActive ? t('services.status.categoryActive') : t('services.status.categoryInactive')}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" size="sm" variant="outline" aria-label={t('services.aria.addService', { name })} onClick={(event) => openServiceForm(sub.id, undefined, event.currentTarget)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('services.addService')}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
            aria-label={t('services.aria.editSubcategory', { name })} onClick={(event) => openSubcategoryForm(categoryId, sub, event.currentTarget)}>
            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
            aria-label={t('services.aria.deleteSubcategory', { name })} onClick={(event) => void handleDeleteSubcategory(sub.id, event.currentTarget)}>
            <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
          </Button>
        </div>
      </div>
      {sub.services?.length ? (
        <div className="app-table-wrap rounded-md border border-line bg-surface  ">
          <ServiceTable rows={sub.services} serviceAccessibleName={serviceAccessibleName}
            onEdit={(service, opener) => openServiceForm(sub.id, service, opener)} onDelete={openServiceDeletion} />
        </div>
      ) : <p className="text-sm italic text-content-muted">{t('services.noServices')}</p>}
    </div>
  )
}
