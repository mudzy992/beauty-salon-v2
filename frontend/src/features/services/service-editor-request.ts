import type { CategoryForm, ModalMode, ServiceForm } from './service-form-types'

export type ServiceEditorRequest = {
  method: 'post' | 'patch'
  url: string
  body: unknown
}

type Params = {
  mode: ModalMode
  editId: string | null
  parentId: string | null
  categoryForm: CategoryForm
  subcategoryForm: CategoryForm
  serviceForm: ServiceForm
}

/**
 * Zahtjev za spremanje kategorije, potkategorije ili usluge.
 *
 * Novi zapis uvijek nosi roditelja (`categoryId` / `subcategoryId`); izmjena
 * postojećeg zapisa mijenja samo vlastita polja.
 */
export const buildServiceEditorRequest = ({
  mode,
  editId,
  parentId,
  categoryForm,
  subcategoryForm,
  serviceForm,
}: Params): ServiceEditorRequest => {
  if (mode === 'category') {
    return editId
      ? { method: 'patch', url: `/api/services/categories/${editId}`, body: categoryForm }
      : { method: 'post', url: '/api/services/categories', body: categoryForm }
  }
  if (mode === 'subcategory') {
    return editId
      ? { method: 'patch', url: `/api/services/subcategories/${editId}`, body: subcategoryForm }
      : { method: 'post', url: '/api/services/subcategories', body: { ...subcategoryForm, categoryId: parentId } }
  }
  return editId
    ? { method: 'patch', url: `/api/services/${editId}`, body: serviceForm }
    : { method: 'post', url: '/api/services', body: { ...serviceForm, subcategoryId: parentId } }
}
