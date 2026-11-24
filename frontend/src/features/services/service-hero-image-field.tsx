import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'

type Props = { heroImage: string; svcFileRef: RefObject<HTMLInputElement>; uploadingImg: boolean; catalogStale: boolean; handleUploadHeroImage: (file: File) => Promise<void> }
export function ServiceHeroImageField({ heroImage, svcFileRef, uploadingImg, catalogStale, handleUploadHeroImage }: Props) {
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
            if (file && !catalogStale) void handleUploadHeroImage(file)
          }}
        />
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { if (!catalogStale) svcFileRef.current?.click() }}
            disabled={uploadingImg}
            aria-disabled={catalogStale || undefined}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            {uploadingImg ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : null}
            {heroImage
              ? t('services.changeImage')
              : t('services.uploadImage')}
          </Button>
        </div>
      </div>

  )
}
