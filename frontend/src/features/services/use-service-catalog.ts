import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAllAdminServiceCategories, fetchAllAdminServiceSubcategories, fetchAllAdminServices } from '../../api/catalog'
import type { Category, Subcategory } from './service-catalog-types'
import type { Service } from './service-types'

type Params = { showApiError: (error: unknown, fallbackKey: string) => void }
export function useServiceCatalog({ showApiError }: Params) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const requestSequence = useRef(0)

  const loadData = useCallback(() => {
    const request = ++requestSequence.current
    setLoading(true)
    setLoadError(false)
    Promise.all([
      fetchAllAdminServiceCategories<Category>(),
      fetchAllAdminServiceSubcategories<Subcategory>(),
      fetchAllAdminServices<Service>(),
    ])
      .then(([categoryList, subcategoryList, serviceList]) => {
        if (request !== requestSequence.current) return
        const subcategoriesById = new Map(
          subcategoryList.map((subcategory) => [
            subcategory.id,
            { ...subcategory, services: [] as Service[] },
          ]),
        )
        serviceList.forEach((service) => {
          subcategoriesById.get(service.subcategoryId)?.services.push(service)
        })
        setCategories(
          categoryList.map((category) => ({
            ...category,
            subcategories: subcategoryList
              .filter((subcategory) => subcategory.categoryId === category.id)
              .map(
                (subcategory) =>
                  subcategoriesById.get(subcategory.id) ?? subcategory,
              ),
          })),
        )
      })
      .catch((err) => {
        if (request !== requestSequence.current) return
        setLoadError(true)
        setCategories([])
        showApiError(err, 'services.errors.loadFailed')
      })
      .finally(() => { if (request === requestSequence.current) setLoading(false) })
  }, [showApiError])


  useEffect(() => {
    loadData()
    return () => { requestSequence.current += 1 }
  }, [loadData])

  return { categories, loading, loadError, loadData }
}
