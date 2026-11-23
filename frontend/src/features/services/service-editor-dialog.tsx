import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { CategoryFields } from './category-fields'
import { ServiceFields } from './service-fields'
import type { CategoryForm, ModalMode, ServiceForm } from './service-form-types'

type Props = {
  open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; modalMode: ModalMode; title: string; saving: boolean
  catForm: CategoryForm; subForm: CategoryForm; svcForm: ServiceForm
  setCatForm: Dispatch<SetStateAction<CategoryForm>>; setSubForm: Dispatch<SetStateAction<CategoryForm>>; setSvcForm: Dispatch<SetStateAction<ServiceForm>>
  svcFileRef: RefObject<HTMLInputElement>; uploadingImg: boolean; handleUploadHeroImage: (file: File) => Promise<void>; onSave: () => void
}
export function ServiceEditorDialog({ open, setOpen, modalMode, title, saving, catForm, subForm, svcForm, setCatForm, setSubForm, setSvcForm, svcFileRef, uploadingImg, handleUploadHeroImage, onSave }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={modalMode === 'service' ? 'max-w-2xl' : 'max-w-lg'}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <CategoryFields modalMode={modalMode} catForm={catForm} subForm={subForm} setCatForm={setCatForm} setSubForm={setSubForm} />
        {modalMode === 'service' ? <ServiceFields svcForm={svcForm} setSvcForm={setSvcForm} svcFileRef={svcFileRef} uploadingImg={uploadingImg} handleUploadHeroImage={handleUploadHeroImage} /> : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
