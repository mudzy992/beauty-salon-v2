import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { cn } from '../../lib/cn'

export const StarRating = ({ rating, max = 5 }: { rating: number; max?: number }) => {
  const { t } = useTranslation()
  return (
    // 1.1.1: zvjezdice su aria-hidden, pa je ovaj aria-label BIO jedina alternativa —
    // ali na <div> (role=generic) je aria-label zabranjen i AT ga ignoriše. role="img"
    // ga čita, pa ocjena postaje stvarno izložena.
    <div role="img" className="flex items-center gap-0.5" aria-label={t('clientAnalyticsPage.rating', { rating, max })}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn('h-3.5 w-3.5', i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-content-strong')}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

