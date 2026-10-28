import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { ConfirmDialog } from './confirm-dialog'
import { isPastPeriod } from '../finance.utils'

type BookLockControlsProps = {
  isLocked: boolean
  year: number
  month: number
  isPending?: boolean
  onLock: () => void
  onUnlock: (reason: string) => void
}

export function BookLockBadge({ isLocked }: { isLocked: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge variant={isLocked ? 'secondary' : 'default'}>
      {isLocked ? t('finance.book.locked') : t('finance.book.open')}
    </Badge>
  )
}

/** Zajedničke lock/unlock kontrole za KIF i KUF – pravila su identična. */
export function BookLockControls({
  isLocked,
  year,
  month,
  isPending = false,
  onLock,
  onUnlock,
}: BookLockControlsProps) {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<'lock' | 'unlock' | null>(null)
  const canUnlock = isPastPeriod(year, month)

  return (
    <>
      {isLocked ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialog('unlock')}
          disabled={isPending || !canUnlock}
          title={
            canUnlock
              ? t('finance.book.unlock')
              : t('finance.book.unlockPastOnly')
          }
        >
          <LockOpen className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          {t('finance.book.unlock')}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialog('lock')}
          disabled={isPending}
        >
          <Lock className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          {t('finance.book.lock')}
        </Button>
      )}

      <ConfirmDialog
        open={dialog === 'lock'}
        onOpenChange={(open) => setDialog(open ? 'lock' : null)}
        title={t('finance.book.lockConfirmTitle')}
        description={t('finance.book.lockConfirmBody')}
        confirmLabel={t('finance.book.lock')}
        isPending={isPending}
        onConfirm={() => {
          onLock()
          setDialog(null)
        }}
      />

      <ConfirmDialog
        open={dialog === 'unlock'}
        onOpenChange={(open) => setDialog(open ? 'unlock' : null)}
        title={t('finance.book.unlockConfirmTitle')}
        description={t('finance.book.unlockExceptionDescription')}
        confirmLabel={t('finance.book.unlock')}
        isDestructive
        isPending={isPending}
        reasonLabel={t('finance.book.unlockReason')}
        onConfirm={(reason) => {
          onUnlock(reason)
          setDialog(null)
        }}
      />
    </>
  )
}
