import { useRef } from 'react'
import { ConfirmDialog } from './confirm-dialog'

/** Potvrda akcije se izvršava tek nakon potvrđivanja; greške obrađuje akcija. */
export type AdminConfirmRequest = {
  title: string
  description: string
  confirmLabel?: string
  action: () => Promise<void> | void
}

export function AdminConfirmDialog({
  request,
  onClose,
}: {
  request: AdminConfirmRequest | null
  onClose: () => void
}) {
  const triggerRef = useRef<HTMLElement | null>(null)

  return (
    <ConfirmDialog
      open={Boolean(request)}
      onOpenChange={(next: boolean) => {
        if (!next) onClose()
      }}
      onOpenAutoFocus={() => {
        triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      }}
      onCloseAutoFocus={(event) => {
        if (triggerRef.current?.isConnected) {
          event.preventDefault()
          triggerRef.current.focus()
        }
        triggerRef.current = null
      }}
      title={request?.title ?? ''}
      description={request?.description}
      confirmLabel={request?.confirmLabel}
      isDestructive
      onConfirm={() => {
        const action = request?.action
        onClose()
        void action?.()
      }}
    />
  )
}
