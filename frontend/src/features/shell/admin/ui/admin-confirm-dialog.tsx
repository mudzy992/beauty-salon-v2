import { ConfirmDialog } from './confirm-dialog'

/**
 * Zalazna točka za administrativne potvrde koje su ranije bile `window.confirm`
 * (O4, vlasnička odluka 2026-11-19). Naslov/opis su prethodno postojeći i18n stringovi;
 * poruka, uvjet i efekt ostaju 1:1 kao kod `window.confirm`.
 *
 * `action` se pokreće tek nakon klika na potvrdu; greške rukuj unutar akcije
 * (postojeći toast obrazac), dijalog se odmah zatvara.
 */
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
  return (
    <ConfirmDialog
      open={Boolean(request)}
      onOpenChange={(next: boolean) => {
        if (!next) onClose()
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
