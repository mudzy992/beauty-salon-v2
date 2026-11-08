import { cn } from '../../../../lib/cn'
import { StatCard, type StatCardProps } from './stat-card'

type StatGridProps = {
  /** Pristupačno ime liste (npr. naziv sekcije kojoj kartice pripadaju). */
  label: string
  items: StatCardProps[]
  columns?: 2 | 3 | 4 | 5
  className?: string
}

const columnsClass = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
} as const

/**
 * Mreža stat kartica.
 *
 * WCAG 1.3.1 — kartice su `<ul>`/`<li>`, pa je veza „ovo je skup istovrsnih
 * pokazatelja" dostupna i bez vizuelnog rasporeda. `<li>` je nužan razlog zašto
 * grid prima `items`, a ne `children`: tako lista ne može ostati bez itema.
 */
export const StatGrid = ({ label, items, columns = 4, className }: StatGridProps) => (
  <ul
    aria-label={label}
    className={cn('grid list-none grid-cols-1 gap-3 p-0', columnsClass[columns], className)}
  >
    {items.map((item) => (
      <li key={item.label}>
        <StatCard {...item} />
      </li>
    ))}
  </ul>
)
