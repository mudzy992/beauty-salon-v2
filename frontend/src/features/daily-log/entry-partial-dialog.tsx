import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  partialDiff: number
  saving: boolean
  onIgnoreDebt: () => void
  onCreateDebt: () => void
}

export const DailyLogPartialDialog = ({
  open,
  onOpenChange,
  partialDiff,
  saving,
  onIgnoreDebt,
  onCreateDebt,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Naplaćuje se manje nego što sistem zahtijeva</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Razlika iznosi {partialDiff.toFixed(2)} KM. Želite li da se ta razlika evidentira kao dug
        klijentu?
      </p>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          Odustani
        </Button>
        <Button type="button" variant="outline" onClick={onIgnoreDebt} disabled={saving}>
          Ne zavodi dug
        </Button>
        <Button type="button" onClick={onCreateDebt} disabled={saving}>
          Zavedi dug
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
