import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'

type Credentials = { username: string; initialPassword: string } | null
type Props = {
  credentialsOpen: boolean
  setCredentialsOpen: Dispatch<SetStateAction<boolean>>
  createdCredentials: Credentials
  setCreatedCredentials: Dispatch<SetStateAction<Credentials>>
  transitioningToCredentials: MutableRefObject<boolean>
  createTriggerRef: RefObject<HTMLButtonElement>
}
export function UserCredentialsDialog({ credentialsOpen, setCredentialsOpen, createdCredentials, setCreatedCredentials, transitioningToCredentials, createTriggerRef }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={credentialsOpen}
      onOpenChange={(open) => {
        setCredentialsOpen(open)
        if (!open) setCreatedCredentials(null)
      }}
    >
      <DialogContent data-users-dialog className="max-w-lg" onCloseAutoFocus={(event) => {
        transitioningToCredentials.current = false
        if (createTriggerRef.current?.isConnected) {
          event.preventDefault()
          createTriggerRef.current.focus()
        }
      }}>
        <DialogHeader>
          <DialogTitle>{t('users.credentials.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-line p-3 ">
            <p className="text-xs text-content-strong">{t('users.credentials.username')}</p>
            <p className="font-semibold text-content">{createdCredentials?.username}</p>
          </div>
          <div className="rounded-md border border-line p-3 ">
            <p className="text-xs text-content-strong">{t('users.credentials.initialPassword')}</p>
            <p className="font-semibold text-content">{createdCredentials?.initialPassword}</p>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t('users.credentials.instructions')}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" onClick={() => { setCredentialsOpen(false); setCreatedCredentials(null) }}>
            {t('users.credentials.acknowledge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  )
}
