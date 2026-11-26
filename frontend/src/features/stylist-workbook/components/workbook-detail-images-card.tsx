import { ChangeEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { MediaImage } from '../../../components/media-image'
import { getUploadUrl } from '../../../utils/uploadUrl'
import type { DailyLogImage } from '../types'

/**
 * „Prije / poslije" slike i upload (S10).
 *
 * Izdvojeno iz `pages/workbook-detail-page.tsx` **bez promjene**: isti prikaz
 * slika, isti opisi (min. 3 znaka), isti file inputi, isti status uploada
 * (`role="status"` + `aria-live="polite"`) i isti fokus nakon uploada.
 */
export const WorkbookDetailImagesCard = ({
  beforeImages,
  afterImages,
  canComplete,
  uploading,
  beforeDescription,
  onBeforeDescriptionChange,
  afterDescription,
  onAfterDescriptionChange,
  beforeFileRef,
  afterFileRef,
  beforeButtonRef,
  afterButtonRef,
  onUpload,
}: {
  beforeImages: DailyLogImage[]
  afterImages: DailyLogImage[]
  canComplete: boolean
  uploading: boolean
  beforeDescription: string
  onBeforeDescriptionChange: (value: string) => void
  afterDescription: string
  onAfterDescriptionChange: (value: string) => void
  beforeFileRef: RefObject<HTMLInputElement>
  afterFileRef: RefObject<HTMLInputElement>
  beforeButtonRef: RefObject<HTMLButtonElement>
  afterButtonRef: RefObject<HTMLButtonElement>
  onUpload: (isBefore: boolean, e: ChangeEvent<HTMLInputElement>) => void
}) => {
  const { t } = useTranslation()

  return (
    <Card className="mt-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-content">
            {t('stylistWorkbook.detail.beforeAfter')}
          </p>
          <p className="mt-1 text-sm text-content-strong">
            {t('stylistWorkbook.detail.beforeAfterHint')}
          </p>
        </div>
      </div>

      {beforeImages.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-content">{t('stylistWorkbook.detail.before')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {beforeImages.map((img) => {
              const uri = getUploadUrl(img.upload?.pathMedium ?? img.upload?.pathThumb ?? img.upload?.pathOriginal)
              return (
                <MediaImage
                  key={img.id}
                  src={uri}
                  alt={img.description || t('stylistWorkbook.detail.before')}
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-line"
                  loading="lazy"
                />
              )
            })}
          </div>
        </div>
      ) : null}

      {afterImages.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-content">{t('stylistWorkbook.detail.after')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {afterImages.map((img) => {
              const uri = getUploadUrl(img.upload?.pathMedium ?? img.upload?.pathThumb ?? img.upload?.pathOriginal)
              return (
                <MediaImage
                  key={img.id}
                  src={uri}
                  alt={img.description || t('stylistWorkbook.detail.after')}
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-line"
                  loading="lazy"
                />
              )
            })}
          </div>
        </div>
      ) : null}

      {canComplete ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p id="image-description-help" className="w-full text-sm text-content-strong">{t('stylistWorkbook.detail.descriptionHelp')}</p>
          <div className="grid w-full gap-1">
            <Label htmlFor="before-image-description">{t('stylistWorkbook.detail.beforeDescription')}</Label>
            <Input id="before-image-description" maxLength={500} value={beforeDescription} onChange={(event) => onBeforeDescriptionChange(event.target.value)} aria-describedby="image-description-help" />
          </div>
          <div className="grid w-full gap-1">
            <Label htmlFor="after-image-description">{t('stylistWorkbook.detail.afterDescription')}</Label>
            <Input id="after-image-description" maxLength={500} value={afterDescription} onChange={(event) => onAfterDescriptionChange(event.target.value)} aria-describedby="image-description-help" />
          </div>
          <input
            ref={beforeFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onUpload(true, e)}
            disabled={uploading}
          />
          <Button ref={beforeButtonRef} type="button" variant="outline" size="sm" disabled={uploading || beforeDescription.trim().length < 3} onClick={() => beforeFileRef.current?.click()}>
            {uploading
              ? t('stylistWorkbook.detail.uploading')
              : t('stylistWorkbook.detail.addBefore')}
          </Button>
          <input
            ref={afterFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onUpload(false, e)}
            disabled={uploading}
          />
          <Button ref={afterButtonRef} type="button" variant="outline" size="sm" disabled={uploading || afterDescription.trim().length < 3} onClick={() => afterFileRef.current?.click()}>
            {uploading
              ? t('stylistWorkbook.detail.uploading')
              : t('stylistWorkbook.detail.addAfter')}
          </Button>
          {uploading ? (
            <div role="status" aria-live="polite" className="text-xs text-content-muted flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {t('stylistWorkbook.detail.uploadInProgress')}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
