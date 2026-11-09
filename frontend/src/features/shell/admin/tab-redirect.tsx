import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * Redirect sa stare rute na `?tab=` hub koji **čuva postojeće query parametre**.
 *
 * Q3 iz plana izričito traži: „Sve stare rute ostaju `<Navigate replace>`,
 * `?tab=` i postojeći query parametri rade." Običan
 * `<Navigate to="/admin/analytics?tab=clients" replace />` bi odbacio
 * `?userId=…` / `?stylistId=…`, a na te deep linkove se oslanjaju
 * `features/daily-log/entry-table.tsx` (201, 238),
 * `features/dashboard/recent-reservations.tsx` (62) i `pages/Analytics.tsx` (396).
 */
export function TabRedirect({ to, tab }: { to: string; tab: string }) {
  const [searchParams] = useSearchParams()
  const next = new URLSearchParams(searchParams)
  next.set('tab', tab)
  return <Navigate to={`${to}?${next.toString()}`} replace />
}
