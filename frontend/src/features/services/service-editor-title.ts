import type { ModalMode } from './service-form-types'

type Translate = (key: string) => string

/** Naslov dijaloga: „Nova" ili „Uredi", zavisno od režima i od toga da li se uređuje. */
export const serviceEditorTitle = (mode: ModalMode, editId: string | null, t: Translate): string => {
  if (mode === 'category') return t(editId ? 'services.editCategory' : 'services.newCategory')
  if (mode === 'subcategory') return t(editId ? 'services.editSubcategory' : 'services.newSubcategory')
  return t(editId ? 'services.editService' : 'services.newService')
}
