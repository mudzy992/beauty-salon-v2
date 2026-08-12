import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { ResponsiveDialog } from '../finance/components/responsive-dialog'

type CancelReservationDialogProps = {
  open: boolean
  busy: boolean
  reason: string
  title: string
  description: string
  reasonLabel: string
  reasonPlaceholder: string
  confirmLabel: string
  dismissLabel: string
  onReasonChange: (value: string) => void
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export const CancelReservationDialog = ({
  open,
  busy,
  reason,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  confirmLabel,
  dismissLabel,
  onReasonChange,
  onConfirm,
  onOpenChange,
}: CancelReservationDialogProps) => (
  <ResponsiveDialog
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    description={description}
    footer={
      <div className="flex flex-wrap gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {dismissLabel}
        </Button>
        <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    }
  >
    <div className="space-y-2">
      <Label htmlFor="cancel-reason">{reasonLabel}</Label>
      <Input
        id="cancel-reason"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        maxLength={500}
        placeholder={reasonPlaceholder}
      />
    </div>
  </ResponsiveDialog>
)
