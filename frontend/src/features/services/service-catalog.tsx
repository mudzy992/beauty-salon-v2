import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { ServiceTable } from './service-table'
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
  const disambiguatedName = <T extends { id: string; name: string }>(item: T, all: T[]) => {
    const matches = all.filter(candidate => candidate.name === item.name)
    return matches.length > 1 ? `${item.name} (${matches.findIndex(candidate => candidate.id === item.id) + 1})` : item.name
  }
  const allSubcategories = categories.flatMap(category => category.subcategories ?? [])
  const allServices = allSubcategories.flatMap(subcategory => subcategory.services ?? [])
  const serviceAccessibleName = (service: Service) => disambiguatedName(service, allServices)


  return (
    categories.length === 0 ? (
      <p className="text-sm text-content-muted">{t('common.noData')}</p>
    ) : (
      <Card className="overflow-hidden">
        <Accordion type="multiple" className="w-full">
          {categories.map((cat) => (
            <AccordionItem key={cat.id} value={cat.id} className="px-4">
              <AccordionTrigger>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="truncate text-base font-semibold">
                    {cat.name}
                  </span>
                  <Badge
                    variant={cat.isActive ? 'success' : 'secondary'}
                    className="text-[10px]"
                  >
                    {cat.isActive
                      ? t('services.status.categoryActive')
                      : t('services.status.categoryInactive')}
                  </Badge>
                  {cat.description ? (
                    <span className="hidden truncate text-sm text-content-muted md:block">
                      — {cat.description}
                    </span>
                  ) : null}
                </div>
                {/* Omotač samo zaustavlja propagaciju klika, ne vrši akciju; pravi
                    interaktivni elementi su dugmad unutar njega i ona su fokusabilna,
                    pa ni 2.1.1 ni 4.1.2 nisu prekršeni. */}
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                <div
                  className="mr-2 flex shrink-0 items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t('services.aria.addSubcategory', { name: disambiguatedName(cat, categories) })}
                    onClick={() => openSubcategoryForm(cat.id)}
                  >
                    <Plus className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t('services.aria.editCategory', { name: disambiguatedName(cat, categories) })}
                    onClick={() => openCategoryForm(cat)}
                  >
                    <Pencil className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t('services.aria.deleteCategory', { name: disambiguatedName(cat, categories) })}
                    onClick={() => void handleDeleteCategory(cat.id)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                {cat.subcategories?.length ? (
                  <div className="space-y-6">
                    {cat.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-md border-l-4 border-l-brand-gold bg-surface-muted p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-content">
                              {sub.name}
                            </p>
                            <Badge
                              variant={sub.isActive ? 'success' : 'secondary'}
                              className="text-[10px]"
                            >
                              {sub.isActive
                                ? t('services.status.categoryActive')
                                : t('services.status.categoryInactive')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openServiceForm(sub.id)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {t('services.addService')}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={t('services.aria.editSubcategory', { name: disambiguatedName(sub, allSubcategories) })}
                              onClick={() => openSubcategoryForm(cat.id, sub)}
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={t(
                                'services.aria.deleteSubcategory', { name: disambiguatedName(sub, allSubcategories) },
                              )}
                              onClick={() =>
                                void handleDeleteSubcategory(sub.id)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </div>
                        </div>

                        {sub.services?.length ? (
                          <div className="app-table-wrap rounded-md border border-line bg-surface  ">
                            <ServiceTable
                              rows={sub.services}
                              serviceAccessibleName={serviceAccessibleName}
                              onEdit={(service) => openServiceForm(sub.id, service)}
                              onDelete={openServiceDeletion}
                            />
                          </div>
                        ) : (
                          <p className="text-sm italic text-content-muted">
                            {t('services.noServices')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-content-muted">
                    {t('services.noSubcategories')}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    )
  )
}
