import { useRef, type ReactNode } from 'react'

import { useIsMobile } from '../../../../hooks/use-is-mobile'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog'
import { Drawer, DrawerContent } from '../../../../components/ui/drawer'

type ResponsiveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  onOpenAutoFocus?: (event: Event) => void
  onCloseAutoFocus?: (event: Event) => void
}

/** Dialog na desktopu, drawer na mobitelu (globalni UX standard). */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const triggerRef = useRef<HTMLElement | null>(null)
  const fallbackRef = useRef<HTMLElement | null>(null)
  const pathRef = useRef('')
  const contentRef = useRef<HTMLDivElement>(null)

  const handleOpenAutoFocus = (event: Event) => {
    const active = document.activeElement
    triggerRef.current = active instanceof HTMLElement && active !== document.body ? active : null
    fallbackRef.current = document.querySelector<HTMLElement>('main[tabindex="-1"]')
    pathRef.current = window.location.pathname
    onOpenAutoFocus?.(event)
  }
  const handleCloseAutoFocus = (event: Event) => {
    onCloseAutoFocus?.(event)
    if (event.defaultPrevented) return
    // Navigation and deliberate focus changes must not be overridden by cleanup.
    const active = document.activeElement
    event.preventDefault()
    if (window.location.pathname !== pathRef.current) return
    if (active && active !== document.body && !contentRef.current?.contains(active)) return
    const trigger = triggerRef.current
    if (trigger?.isConnected && !trigger.matches(':disabled') && trigger.getClientRects().length > 0) trigger.focus()
    else if (fallbackRef.current?.isConnected) fallbackRef.current.focus()
    triggerRef.current = null
    fallbackRef.current = null
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          side="right"
          ref={contentRef}
          onOpenAutoFocus={handleOpenAutoFocus}
          onCloseAutoFocus={handleCloseAutoFocus}
          className="flex h-full w-full max-w-full flex-col gap-0 p-0"
        >
          <div className="border-b border-line px-4 py-3 ">
            <DialogTitle className="text-base font-semibold text-content">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="mt-1 text-xs text-content-strong ">
                {description}
              </DialogDescription>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer ? (
            <div className="border-t border-line px-4 py-3 ">
              {footer}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={contentRef} className={className ?? 'max-w-2xl'} onOpenAutoFocus={handleOpenAutoFocus} onCloseAutoFocus={handleCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">{children}</div>
        {footer}
      </DialogContent>
    </Dialog>
  )
}
