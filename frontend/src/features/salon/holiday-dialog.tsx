import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'

type HolidayForm = { date: string; name: string; message: string; sendPush: boolean }
type Props = { holidayOpen: boolean; setHolidayOpen: Dispatch<SetStateAction<boolean>>; isEditing: boolean; holForm: HolidayForm; setHolForm: Dispatch<SetStateAction<HolidayForm>>; saving: boolean; onSave: () => void }
export function HolidayDialog({ holidayOpen, setHolidayOpen, isEditing, holForm, setHolForm, saving, onSave }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(isEditing ? 'salon.holidayForm.editTitle' : 'salon.holidayForm.newTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salon-holiday-form-date">{t('salon.holidayForm.date')}</Label>
              <Input id="salon-holiday-form-date" type="date" value={holForm.date} onChange={(e) => setHolForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-holiday-form-name">{t('salon.holidayForm.name')}</Label>
              <Input id="salon-holiday-form-name" value={holForm.name} onChange={(e) => setHolForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="salon-holiday-form-message">{t('salon.holidayForm.message')}</Label>
            <Textarea id="salon-holiday-form-message" rows={3} value={holForm.message} onChange={(e) => setHolForm((p) => ({ ...p, message: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-line p-3 ">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-content">{t('salon.holidayForm.sendPush')}</p>
              <p className="text-xs text-content-strong">{t('salon.holidayForm.sendPushHint')}</p>
            </div>
            <Switch
              aria-label={t('salon.holidayForm.sendPush')}
              checked={holForm.sendPush}
              onCheckedChange={(checked) => setHolForm((p) => ({ ...p, sendPush: checked }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => setHolidayOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
