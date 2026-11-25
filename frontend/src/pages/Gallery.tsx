import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { GalleryAddImageDialog } from '../features/gallery/gallery-add-image-dialog'
import { GalleryCategoryDialog } from '../features/gallery/gallery-category-dialog'
import { GalleryCategoryList } from '../features/gallery/gallery-category-list'
import { GalleryImageDialog } from '../features/gallery/gallery-image-dialog'
import { GalleryImageGrid } from '../features/gallery/gallery-image-grid'
import { useGalleryCategories } from '../features/gallery/use-gallery-categories'
import { useGalleryImageEdit } from '../features/gallery/use-gallery-image-edit'
import { useGalleryImageUpload } from '../features/gallery/use-gallery-image-upload'
import { AdminConfirmDialog } from '../features/shell/admin/ui/admin-confirm-dialog'

/**
 * Admin galerija radova (S9).
 *
 * Stranica je sada **orkestrator**: stanje i akcije su u
 * `features/gallery/use-gallery-categories.ts`, a prezentacija je razdvojena na
 * četiri komponente (lista kategorija, mreža slika i dva dijaloga). Markup,
 * poruke, redoslijed poziva i klice za testove su **nepromijenjeni** — pomjereni
 * su u module, pa iste tvrdnje postojećih testova i dalje vrijede.
 */
export default function Gallery() {
  const { t } = useTranslation()
  const gallery = useGalleryCategories()
  const imageEdit = useGalleryImageEdit({
    selectedCatId: gallery.selectedCatId,
    loadImages: gallery.loadImages,
    loadCategories: gallery.loadCategories,
    setConfirmRequest: gallery.setConfirmRequest,
  })
  const upload = useGalleryImageUpload({
    selectedCatId: gallery.selectedCatId,
    loadImages: gallery.loadImages,
    loadCategories: gallery.loadCategories,
  })

  if (gallery.loading) {
    return (
      <div className="flex justify-center p-10 text-content-muted">
        <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div data-admin-gallery>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-content">{t('nav.gallery')}</h1>
        <Button type="button" onClick={() => gallery.openCatForm()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('gallery.admin.newCategory')}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-[300px] lg:min-w-[280px]">
          <GalleryCategoryList
            categories={gallery.categories}
            selectedCatId={gallery.selectedCatId}
            loadImages={gallery.loadImages}
            onEdit={gallery.openCatForm}
            onDelete={gallery.handleDeleteCat}
          />
        </div>

        <div className="flex-1">
          {!gallery.selectedCatId ? (
            <Card className="p-6">
              <p className="text-sm text-content-muted">{t('gallery.admin.selectCategoryPrompt')}</p>
            </Card>
          ) : (
            <GalleryImageGrid
              categories={gallery.categories}
              selectedCatId={gallery.selectedCatId}
              images={gallery.catImages}
              loading={gallery.imagesLoading}
              onEdit={imageEdit.openImgEdit}
              onDelete={imageEdit.handleDeleteImg}
              onAddImage={() => void upload.openAddImage()}
            />
          )}
        </div>
      </div>

      <GalleryCategoryDialog
        open={gallery.catOpen}
        onOpenChange={gallery.setCatOpen}
        editing={gallery.editCatId !== null}
        form={gallery.catForm}
        setForm={gallery.setCatForm}
        saving={gallery.saving}
        onSave={() => void gallery.handleSaveCat()}
      />

      <GalleryAddImageDialog
        open={upload.addImageOpen}
        onOpenChange={upload.setAddImageOpen}
        eligibleImages={upload.eligibleImages}
        eligibleLoading={upload.eligibleLoading}
        eligibleSelectedId={upload.eligibleSelectedId}
        setEligibleSelectedId={upload.setEligibleSelectedId}
        manualFile={upload.manualFile}
        setManualFile={upload.setManualFile}
        manualTitle={upload.manualTitle}
        setManualTitle={upload.setManualTitle}
        nonClientConfirmed={upload.nonClientConfirmed}
        setNonClientConfirmed={upload.setNonClientConfirmed}
        addingImage={upload.addingImage}
        onAddConsented={() => void upload.handleAddConsentedImage()}
        onUploadNonClient={() => void upload.handleUploadNonClientImage()}
      />

      <GalleryImageDialog
        open={imageEdit.imgOpen}
        onOpenChange={imageEdit.setImgOpen}
        form={imageEdit.imgForm}
        setForm={imageEdit.setImgForm}
        saving={imageEdit.saving}
        canSave={imageEdit.editImgId !== null}
        onSave={() => void imageEdit.handleSaveImg()}
      />

      <AdminConfirmDialog
        request={gallery.confirmRequest}
        onClose={() => gallery.setConfirmRequest(null)}
      />
    </div>
  )
}
