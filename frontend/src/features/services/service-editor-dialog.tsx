import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { CategoryFields } from './category-fields'
import { ServiceFields } from './service-fields'
import type { CategoryForm, ModalMode, ServiceForm } from './service-form-types'

type Props = {
  openerRef: RefObject<HTMLElement>; fallbackFocusRef: RefObject<HTMLElement>; catalogReloadingRef: RefObject<boolean>; open: boolean; setOpen: (open: boolean) => void; modalMode: ModalMode; title: string; saving: boolean; catalogStale: boolean
  catForm: CategoryForm; subForm: CategoryForm; svcForm: ServiceForm
  setCatForm: Dispatch<SetStateAction<CategoryForm>>; setSubForm: Dispatch<SetStateAction<CategoryForm>>; setSvcForm: Dispatch<SetStateAction<ServiceForm>>
  svcFileRef: RefObject<HTMLInputElement>; uploadingImg: boolean; handleUploadHeroImage: (file: File) => Promise<void>; onSave: () => void
}
export function ServiceEditorDialog({ openerRef, fallbackFocusRef, catalogReloadingRef, open, setOpen, modalMode, title, saving, catalogStale, catForm, subForm, svcForm, setCatForm, setSubForm, setSvcForm, svcFileRef, uploadingImg, handleUploadHeroImage, onSave }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={modalMode === 'service' ? 'max-w-2xl' : 'max-w-lg'}
        onCloseAutoFocus={(event) => {
          const target = catalogReloadingRef.current ? fallbackFocusRef.current : (openerRef.current?.isConnected ? openerRef.current : fallbackFocusRef.current)
          if (target?.isConnected) {
            event.preventDefault()
            target.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <CategoryFields modalMode={modalMode} catForm={catForm} subForm={subForm} setCatForm={setCatForm} setSubForm={setSubForm} />
        {modalMode === 'service' ? <ServiceFields svcForm={svcForm} setSvcForm={setSvcForm} svcFileRef={svcFileRef} uploadingImg={uploadingImg} catalogStale={catalogStale} handleUploadHeroImage={handleUploadHeroImage} /> : null}

        {catalogStale ? <p role="alert" className="text-sm text-content-strong">{t('services.catalogChanged')}</p> : null}
        {uploadingImg || saving ? <p role="status" aria-live="polite" className="text-sm text-content-strong">{t(saving ? 'services.savePending' : 'services.uploadPending')}</p> : null}
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
            disabled={saving || (modalMode === 'service' && uploadingImg)}
            aria-disabled={catalogStale || undefined}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : null}
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
