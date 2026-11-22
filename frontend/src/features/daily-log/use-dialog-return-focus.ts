import { useLayoutEffect, useRef } from 'react'

// Controlled dialogs have no Radix Trigger. Remember the invoking control and
// use the route landmark when a refreshed/deleted row no longer exists.
export function useDailyLogDialogReturnFocus(open: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const fallbackRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef('')

  const onOpenAutoFocus = () => {
    const active = document.activeElement
    triggerRef.current = active instanceof HTMLElement && active !== document.body ? active : null
    fallbackRef.current = document.querySelector<HTMLElement>('main[tabindex="-1"]')
    pathRef.current = window.location.pathname
  }
  // A dialog can reopen before its exit animation unmounts the focus scope;
  // Radix then does not fire onOpenAutoFocus again. Capture the new invoker if
  // focus is still outside, while keeping the original if Radix already moved it.
  useLayoutEffect(() => {
    if (!open) return
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== document.body && !contentRef.current?.contains(active)) {
      triggerRef.current = active
      fallbackRef.current = document.querySelector<HTMLElement>('main[tabindex="-1"]')
      pathRef.current = window.location.pathname
    }
  }, [open])

  const onCloseAutoFocus = (event: Event) => {
    const active = document.activeElement
    event.preventDefault()
    if (window.location.pathname !== pathRef.current) return
    if (active && active !== document.body && !contentRef.current?.contains(active)) return
    const trigger = triggerRef.current
    if (trigger?.isConnected && !trigger.matches(':disabled') && trigger.getClientRects().length > 0) trigger.focus()
    else if (fallbackRef.current?.isConnected) fallbackRef.current.focus()
  }
  return { contentRef, onOpenAutoFocus, onCloseAutoFocus }
}
