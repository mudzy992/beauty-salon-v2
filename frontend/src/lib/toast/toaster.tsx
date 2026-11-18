import { Toaster } from 'sonner'

export const AppToaster = () => {
  return (
    <Toaster
      richColors
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-surface text-content border border-line',
          title: 'text-sm font-medium',
          description: 'text-sm text-content-strong',
          actionButton:
            'rounded-full bg-surface-inverse px-4 py-2 text-sm font-medium text-on-surface-inverse hover:bg-surface-inverse/90',
          cancelButton: 'bg-surface-muted text-content hover:bg-surface-muted/80',
        },
      }}
    />
  )
}

