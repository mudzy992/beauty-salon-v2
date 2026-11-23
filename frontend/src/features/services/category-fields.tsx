import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'
import type { CategoryForm, ModalMode } from './service-form-types'

type Props = { modalMode: ModalMode; catForm: CategoryForm; subForm: CategoryForm; setCatForm: Dispatch<SetStateAction<CategoryForm>>; setSubForm: Dispatch<SetStateAction<CategoryForm>> }
export function CategoryFields({ modalMode, catForm, subForm, setCatForm, setSubForm }: Props) {
  const { t } = useTranslation()
  return (
    <>
      {modalMode === 'category' ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="services-common-name">{t('common.name')}</Label>
            <Input id="services-common-name"
              className="mt-1"
              value={catForm.name}
              onChange={(e) =>
                setCatForm({ ...catForm, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="services-common-description">{t('common.description')}</Label>
            <Textarea id="services-common-description"
              className="mt-1"
              value={catForm.description}
              onChange={(e) =>
                setCatForm({ ...catForm, description: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="services-sort-order">{t('services.sortOrder')}</Label>
              <Input id="services-sort-order"
                className="mt-1"
                type="number"
                min={0}
                value={catForm.sortOrder}
                onChange={(e) =>
                  setCatForm({
                    ...catForm,
                    sortOrder: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 md:pt-7">
              <Label className="mb-0">
                {t('services.status.categoryActive')}
              </Label>
              <Switch
                aria-label={t('services.aria.categoryActiveToggle')}
                checked={catForm.isActive}
                onCheckedChange={(checked) =>
                  setCatForm({ ...catForm, isActive: checked })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {modalMode === 'subcategory' ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="services-common-name-2">{t('common.name')}</Label>
            <Input id="services-common-name-2"
              className="mt-1"
              value={subForm.name}
              onChange={(e) =>
                setSubForm({ ...subForm, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="services-common-description-2">{t('common.description')}</Label>
            <Textarea id="services-common-description-2"
              className="mt-1"
              value={subForm.description}
              onChange={(e) =>
                setSubForm({ ...subForm, description: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="services-services-sort-order-2">{t('services.sortOrder')}</Label>
              <Input id="services-services-sort-order-2"
                className="mt-1"
                type="number"
                min={0}
                value={subForm.sortOrder}
                onChange={(e) =>
                  setSubForm({
                    ...subForm,
                    sortOrder: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 md:pt-7">
              <Label className="mb-0">
                {t('services.status.categoryActive')}
              </Label>
              <Switch
                aria-label={t('services.aria.subcategoryActiveToggle')}
                checked={subForm.isActive}
                onCheckedChange={(checked) =>
                  setSubForm({ ...subForm, isActive: checked })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
