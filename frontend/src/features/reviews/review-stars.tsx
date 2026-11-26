import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'

import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'

/**
 * Zvjezdice ocjene u admin recenzijama (S9).
 *
 * 1.1.1: ikone su `aria-hidden`, a brojčanu alternativu nosi `role="img"` +
 * `aria-label` — bez toga bi ćelije ocjena u tabeli bile prazne za čitač ekrana.
 *
 * Boje (S9): popunjena zvjezdica je `brand-gold-text` (5.35:1 na bijeloj površini
 * temi, 7.95:1 u Aurum svijetloj) umjesto `yellow-400` (1.53:1 — ispod praga 1.4.11),
 * a prazna je `content-strong` umjesto `slate-300` (1.47:1).
 */
export function ReviewStars({ count }: { count: number }) {
  const { t, i18n } = useTranslation()
  return (
    <div
      role="img"
      aria-label={t('reviews.aria.ratingValue', {
        value: formatLocalizedNumber(count, i18n.language),
        max: formatLocalizedNumber(5, i18n.language),
      })}
      className="flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < count ? 'h-4 w-4 fill-brand-gold-text text-brand-gold-text' : 'h-4 w-4 text-content-strong'}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
