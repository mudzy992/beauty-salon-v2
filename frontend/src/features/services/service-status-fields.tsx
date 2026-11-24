import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import type { ServiceForm } from './service-form-types'

type Props = { svcForm: ServiceForm; setSvcForm: Dispatch<SetStateAction<ServiceForm>> }
export function ServiceStatusFields({ svcForm, setSvcForm }: Props) {
  const { t } = useTranslation()
  return (<>
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
  </>)
}
