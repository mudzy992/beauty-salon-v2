import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import type { BeforeAfterPair } from './work-gallery-page'

export function WorkGalleryActions({ pair, index, items, busy, orderBusy, orderBlocked, orderRevision, onHide, onMove }: {
  pair: BeforeAfterPair
  index: number
  items: BeforeAfterPair[]
  busy: boolean
  orderBusy: boolean
  orderBlocked: boolean
  orderRevision: string | null
  onHide: (id: string, revision: string, trigger: HTMLButtonElement) => void
  onMove: (first: BeforeAfterPair, second: BeforeAfterPair, revision: string | null, trigger: HTMLButtonElement) => void
}) {
  const { t } = useTranslation()
  const disabled = busy || orderBusy || orderBlocked
  const buttonClass = 'h-auto min-h-10 max-w-full whitespace-normal text-center aria-disabled:opacity-50'
  return <div className="flex flex-wrap gap-2 p-3">
    <Button type="button" variant="outline" className={buttonClass} aria-disabled={busy || orderBusy}
      onClick={event => { if (!busy && !orderBusy && pair.revision) onHide(pair.id, pair.revision, event.currentTarget) }}>
      {t('admin.serviceWorkGallery.hidePair', { current: index + 1 })}
    </Button>
    <Button type="button" variant="outline" className={buttonClass} aria-disabled={disabled || index === 0}
      onClick={event => { if (!disabled && index > 0) onMove(pair, items[index - 1], orderRevision, event.currentTarget) }}>
      {t('admin.serviceWorkGallery.moveEarlier', { current: index + 1 })}
    </Button>
    <Button type="button" variant="outline" className={buttonClass} aria-disabled={disabled || index === items.length - 1}
      onClick={event => { if (!disabled && index < items.length - 1) onMove(pair, items[index + 1], orderRevision, event.currentTarget) }}>
      {t('admin.serviceWorkGallery.moveLater', { current: index + 1 })}
    </Button>
  </div>
}
