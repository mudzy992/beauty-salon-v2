import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { ServiceHeroImageField } from './service-hero-image-field'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { ServiceStatusFields } from './service-status-fields'
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
      <ServiceHeroImageField heroImage={svcForm.heroImage} svcFileRef={svcFileRef} uploadingImg={uploadingImg} handleUploadHeroImage={handleUploadHeroImage} />

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

      <ServiceStatusFields svcForm={svcForm} setSvcForm={setSvcForm} />
    </div>
  )
}
