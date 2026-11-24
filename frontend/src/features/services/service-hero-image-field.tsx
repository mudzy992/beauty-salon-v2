import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'

type Props = { heroImage: string; svcFileRef: RefObject<HTMLInputElement>; uploadingImg: boolean; handleUploadHeroImage: (file: File) => Promise<void> }
export function ServiceHeroImageField({ heroImage, svcFileRef, uploadingImg, handleUploadHeroImage }: Props) {
  const { t } = useTranslation()
  return (
      <div>
        <Label>{t('services.heroImage')}</Label>
        <MediaImage
          src={getUploadUrl(heroImage)}
          alt={t('services.heroImage')}
          className="mt-2 max-h-32 w-full rounded-md object-cover"
        />
        <input
          type="file"
          accept="image/*"
          ref={svcFileRef}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUploadHeroImage(file)
          }}
        />
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => svcFileRef.current?.click()}
            disabled={uploadingImg}
          >
            {uploadingImg ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {heroImage
              ? t('services.changeImage')
              : t('services.uploadImage')}
          </Button>
        </div>
      </div>

  )
}
