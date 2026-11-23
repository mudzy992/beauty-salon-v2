import type { ReactNode } from 'react'
import { useTableScrollRegion } from '../shell/admin/ui/use-table-scroll-region'

// Each tab mounts its own region, so overflow focusability updates when it becomes active.
export const AnalyticsTableRegion = ({ label, children }: { label: string; children: ReactNode }) => {
  const ref = useTableScrollRegion()
  return <div ref={ref} className="app-table-wrap" role="region" aria-label={label}>{children}</div>
}

