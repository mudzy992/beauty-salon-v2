import { useRef } from 'react'
import { ConfirmDialog } from './confirm-dialog'

/** Potvrda akcije se izvršava tek nakon potvrđivanja; greške obrađuje akcija. */
export type AdminConfirmRequest = {
  title: string
  description: string
  confirmLabel?: string
  trigger?: HTMLElement | null
  isDestructive?: boolean
  action: () => Promise<void> | void
}

export function AdminConfirmDialog({
  request,
  onClose,
  fallbackFocusRef,
  blockedReason,
  shouldBlock,
}: {
  request: AdminConfirmRequest | null
  onClose: () => void
  fallbackFocusRef?: { current: HTMLElement | null }
  blockedReason?: string
  shouldBlock?: () => boolean
}) {
  const triggerRef = useRef<HTMLElement | null>(null)

  return (
    <ConfirmDialog
      open={Boolean(request)}
      onOpenChange={(next: boolean) => {
        if (!next) onClose()
      }}
      onOpenAutoFocus={() => {
        triggerRef.current = request?.trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
      }}
      onCloseAutoFocus={(event) => {
        const trigger = triggerRef.current
        const target = trigger?.isConnected && !trigger.matches(':disabled')
          ? trigger
          : fallbackFocusRef?.current
        if (target?.isConnected) {
          event.preventDefault()
          target.focus()
        }
        triggerRef.current = null
      }}
      title={request?.title ?? ''}
      description={request?.description}
      confirmLabel={request?.confirmLabel}
      isDestructive={request?.isDestructive ?? true}
      blockedReason={blockedReason}
      onConfirm={() => {
        if (blockedReason || shouldBlock?.()) return
        const action = request?.action
        onClose()
        void action?.()
      }}
    />
  )
}
