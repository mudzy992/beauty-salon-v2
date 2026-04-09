import { Toaster } from 'sonner'

export const AppToaster = () => {
  return (
    <Toaster
      richColors
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-white text-black border border-slate-200 dark:bg-slate-900 dark:text-white dark:border-slate-800',
          title: 'text-sm font-medium',
          description: 'text-sm text-slate-600 dark:text-slate-300',
          actionButton: 'bg-brand-gold text-black hover:bg-brand-champagne',
          cancelButton: 'bg-slate-100 text-black hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700',
        },
      }}
    />
  )
}

