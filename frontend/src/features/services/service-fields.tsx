import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'
import type { ServiceForm } from './service-form-types'

type Props = { svcForm: ServiceForm; setSvcForm: Dispatch<SetStateAction<ServiceForm>>; svcFileRef: RefObject<HTMLInputElement>; uploadingImg: boolean; handleUploadHeroImage: (file: File) => Promise<void> }
export function ServiceFields({ svcForm, setSvcForm, svcFileRef, uploadingImg, handleUploadHeroImage }: Props) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="services-service-name">{t('services.serviceName')}</Label>
        <Input id="services-service-name"
          className="mt-1"
          value={svcForm.name}
          onChange={(e) =>
            setSvcForm({ ...svcForm, name: e.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor="services-short-description">{t('services.shortDescription')}</Label>
        <Textarea id="services-short-description"
          className="mt-1"
          value={svcForm.shortDescription}
          onChange={(e) =>
            setSvcForm({ ...svcForm, shortDescription: e.target.value })
          }
          rows={2}
        />
      </div>
      <div>
        <Label>{t('services.heroImage')}</Label>
        <MediaImage
          src={getUploadUrl(svcForm.heroImage)}
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
            {svcForm.heroImage
              ? t('services.changeImage')
              : t('services.uploadImage')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="services-duration">{t('services.duration')}</Label>
          <Input id="services-duration"
            className="mt-1"
            type="number"
            min={5}
            max={480}
            step={5}
            value={svcForm.durationMinutes}
            onChange={(e) =>
              setSvcForm({
                ...svcForm,
                durationMinutes: Number(e.target.value) || 15,
              })
            }
          />
        </div>
        <div>
          <Label htmlFor="services-price">{t('services.price')}</Label>
          <Input id="services-price"
            className="mt-1"
            type="number"
            min={0}
            step={0.5}
            value={svcForm.price}
            onChange={(e) =>
              setSvcForm({
                ...svcForm,
                price: Number(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="services-gender">{t('services.gender')}</Label>
          <Select id="services-gender"
            className="mt-1"
            value={svcForm.gender}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setSvcForm({
                ...svcForm,
                gender: e.target.value as 'MALE' | 'FEMALE',
              })
            }
          >
            <option value="FEMALE">{t('users.gender.female')}</option>
            <option value="MALE">{t('users.gender.male')}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="services-services-sort-order-3">{t('services.sortOrder')}</Label>
          <Input id="services-services-sort-order-3"
            className="mt-1"
            type="number"
            min={0}
            value={svcForm.sortOrder}
            onChange={(e) =>
              setSvcForm({
                ...svcForm,
                sortOrder: Number(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Label className="mb-0">
            {t('services.status.serviceActive')}
          </Label>
          <Switch
            aria-label={t('services.aria.serviceActiveToggle')}
            checked={svcForm.isActive}
            onCheckedChange={(checked) =>
              setSvcForm({ ...svcForm, isActive: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label className="mb-0">{t('services.loyalty')}</Label>
          <Switch
            aria-label={t('services.aria.loyaltyToggle')}
            checked={svcForm.loyaltyEnabled}
            onCheckedChange={(checked) =>
              setSvcForm({ ...svcForm, loyaltyEnabled: checked })
            }
          />
        </div>
      </div>

      {svcForm.loyaltyEnabled ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="services-max-discount">{t('services.maxDiscount')}</Label>
            <Input id="services-max-discount"
              className="mt-1"
              type="number"
              min={0}
              max={100}
              value={svcForm.loyaltyMaxDiscountPercent}
              onChange={(e) =>
                setSvcForm({
                  ...svcForm,
                  loyaltyMaxDiscountPercent:
                    Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
