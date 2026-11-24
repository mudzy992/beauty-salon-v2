import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { disambiguatedName } from './service-catalog-names'
import { ServiceSubcategory } from './service-subcategory'
import type { Service } from './service-types'
import type { Category, Subcategory } from './service-catalog-types'

type Props = {
  cat: Category
  categories: Category[]
  allSubcategories: Subcategory[]
  serviceAccessibleName: (service: Service) => string
  openCategoryForm: (category: Category | undefined, opener: HTMLButtonElement) => void
  openSubcategoryForm: (categoryId: string, subcategory: Subcategory | undefined, opener: HTMLButtonElement) => void
  openServiceForm: (subcategoryId: string, service: Service | undefined, opener: HTMLButtonElement) => void
  handleDeleteCategory: (id: string, opener: HTMLButtonElement) => void
  handleDeleteSubcategory: (id: string, opener: HTMLButtonElement) => void
  openServiceDeletion: (service: Service, opener: HTMLButtonElement) => void
}
export function ServiceCategoryItem({ cat, categories, allSubcategories, serviceAccessibleName, openCategoryForm, openSubcategoryForm, openServiceForm, handleDeleteCategory, handleDeleteSubcategory, openServiceDeletion }: Props) {
  const { t } = useTranslation()
  const name = disambiguatedName(cat, categories)
  return (
    <AccordionItem value={cat.id} className="px-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <AccordionTrigger>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="truncate text-base font-semibold">{cat.name}</span>
              {name !== cat.name ? <span className="sr-only">{name.slice(cat.name.length)}</span> : null}
              <Badge variant={cat.isActive ? 'success' : 'secondary'} className="text-[10px]">
                {cat.isActive ? t('services.status.categoryActive') : t('services.status.categoryInactive')}
              </Badge>
              {cat.description ? <span className="hidden truncate text-sm text-content-muted md:block">— {cat.description}</span> : null}
            </div>
          </AccordionTrigger>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('services.aria.addSubcategory', { name })} onClick={(event) => openSubcategoryForm(cat.id, undefined, event.currentTarget)}>
            <Plus className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('services.aria.editCategory', { name })} onClick={(event) => openCategoryForm(cat, event.currentTarget)}>
            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('services.aria.deleteCategory', { name })} onClick={(event) => void handleDeleteCategory(cat.id, event.currentTarget)}>
            <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <AccordionContent className="pb-6">
        {cat.subcategories?.length ? (
          <div className="space-y-6">
            {cat.subcategories.map(sub => <ServiceSubcategory key={sub.id} sub={sub} categoryId={cat.id} allSubcategories={allSubcategories}
              serviceAccessibleName={serviceAccessibleName} openSubcategoryForm={openSubcategoryForm} openServiceForm={openServiceForm}
              handleDeleteSubcategory={handleDeleteSubcategory} openServiceDeletion={openServiceDeletion} />)}
          </div>
        ) : <p className="text-sm italic text-content-muted">{t('services.noSubcategories')}</p>}
      </AccordionContent>
    </AccordionItem>
  )
}
