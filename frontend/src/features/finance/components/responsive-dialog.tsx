import type { ReactNode } from 'react'

import { useIsMobile } from '../../../hooks/use-is-mobile'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'

type ResponsiveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
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
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          side="right"
          className="flex h-full w-full max-w-full flex-col gap-0 p-0"
        >
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer ? (
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              {footer}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className ?? 'max-w-2xl'}>
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
