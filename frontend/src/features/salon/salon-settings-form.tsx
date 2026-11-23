import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type { useSalonManagement } from './use-salon-management'

type Props = Pick<ReturnType<typeof useSalonManagement>, 'formData' | 'setFormData' | 'saving' | 'handleSaveSettings'>
export function SalonSettingsForm({ formData, setFormData, saving, handleSaveSettings }: Props) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="salon-salon-salon-name-2">{t('salon.salonName')}</Label>
          <Input id="salon-salon-salon-name-2" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-salon-address-2">{t('salon.address')}</Label>
          <Input id="salon-salon-address-2" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-salon-phone-2">{t('salon.phone')}</Label>
          <Input id="salon-salon-phone-2" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-salon-email-2">{t('salon.email')}</Label>
          <Input id="salon-salon-email-2" type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="salon-salon-description-2">{t('salon.description')}</Label>
          <Textarea id="salon-salon-description-2" rows={4} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="salon-pause-between">{t('salon.pauseBetween')}</Label>
          <Input id="salon-pause-between"
            type="number"
            min={0}
            value={String(formData.pauseBetweenServices)}
            onChange={(e) => setFormData((p) => ({ ...p, pauseBetweenServices: Number(e.target.value || 0) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-cancellation-deadline">{t('salon.cancellationDeadline')}</Label>
          <Input id="salon-cancellation-deadline"
            type="number"
            min={0}
            value={String(formData.cancellationDeadlineHours)}
            onChange={(e) => setFormData((p) => ({ ...p, cancellationDeadlineHours: Number(e.target.value || 0) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-reservation-lock">{t('salon.reservationLock')}</Label>
          <Input id="salon-reservation-lock"
            type="number"
            min={1}
            value={String(formData.reservationLockMinutes)}
            onChange={(e) => setFormData((p) => ({ ...p, reservationLockMinutes: Number(e.target.value || 0) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-max-cancellations">{t('salon.maxCancellations')}</Label>
          <Input id="salon-max-cancellations"
            type="number"
            min={0}
            value={String(formData.maxCancellationsBeforePenalty)}
            onChange={(e) => setFormData((p) => ({ ...p, maxCancellationsBeforePenalty: Number(e.target.value || 0) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-penalty-duration">{t('salon.penaltyDuration')}</Label>
          <Input id="salon-penalty-duration"
            type="number"
            min={0}
            value={String(formData.penaltyDurationDays)}
            onChange={(e) => setFormData((p) => ({ ...p, penaltyDurationDays: Number(e.target.value || 0) }))}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={() => void handleSaveSettings()} disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </>
  )
}
