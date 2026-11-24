import { useTranslation } from 'react-i18next'
import { Accordion } from '../../components/ui/accordion'
import { Card } from '../../components/ui/card'
import { ServiceCategoryItem } from './service-category-item'
import { disambiguatedName } from './service-catalog-names'
import type { Service } from './service-types'
import type { Category, Subcategory } from './service-catalog-types'

type Props = {
  categories: Category[]
  openCategoryForm: (category?: Category) => void
  openSubcategoryForm: (categoryId: string, subcategory?: Subcategory) => void
  openServiceForm: (subcategoryId: string, service?: Service) => void
  handleDeleteCategory: (id: string) => void
  handleDeleteSubcategory: (id: string) => void
  openServiceDeletion: (service: Service) => void
}
export function ServiceCatalog({ categories, openCategoryForm, openSubcategoryForm, openServiceForm, handleDeleteCategory, handleDeleteSubcategory, openServiceDeletion }: Props) {
  const { t } = useTranslation()
  const allSubcategories = categories.flatMap(category => category.subcategories ?? [])
  const allServices = allSubcategories.flatMap(subcategory => subcategory.services ?? [])
  const serviceAccessibleName = (service: Service) => disambiguatedName(service, allServices)

  return categories.length === 0 ? <p className="text-sm text-content-muted">{t('common.noData')}</p> : (
    <Card className="overflow-hidden">
      <Accordion type="multiple" className="w-full">
        {categories.map(cat => <ServiceCategoryItem key={cat.id} cat={cat} categories={categories} allSubcategories={allSubcategories}
          serviceAccessibleName={serviceAccessibleName} openCategoryForm={openCategoryForm} openSubcategoryForm={openSubcategoryForm}
          openServiceForm={openServiceForm} handleDeleteCategory={handleDeleteCategory} handleDeleteSubcategory={handleDeleteSubcategory}
          openServiceDeletion={openServiceDeletion} />)}
      </Accordion>
    </Card>
  )
}
