import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type { useSalonManagement } from './use-salon-management'

type Props = Pick<ReturnType<typeof useSalonManagement>, 'formData' | 'setFormData' | 'saving' | 'handleCreateSalon'>
export function CreateSalonForm({ formData, setFormData, saving, handleCreateSalon }: Props) {
  const { t } = useTranslation()
  return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="salon-salon-name">{t('salon.salonName')}</Label>
          <Input id="salon-salon-name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="salon-phone">{t('salon.phone')}</Label>
            <Input id="salon-phone" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salon-email">{t('salon.email')}</Label>
            <Input id="salon-email" type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-address">{t('salon.address')}</Label>
          <Input id="salon-address" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salon-description">{t('salon.description')}</Label>
          <Textarea id="salon-description" rows={3} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={() => void handleCreateSalon()} disabled={saving}>
            {saving ? t('common.saving') : t('salon.createButton')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
