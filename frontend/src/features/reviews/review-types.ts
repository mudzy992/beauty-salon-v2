/**
 * Tipovi admin recenzija (S9).
 *
 * Izdvojeno iz `pages/Reviews.tsx` bez promjene oblika podataka.
 */

export interface Review {
  id: string
  serviceRating: number
  stylistRating: number | null
  comment: string | null
  isApproved: boolean | null
  createdAt: string
  service?: { name: string }
  stylist?: { user?: { firstName: string | null; lastName: string | null } }
  user?: { firstName: string | null; lastName: string | null }
}

/** Ime klijenta ili frizera — prazno ime ostaje „-“ (ista zamjena kao prije). */
export const getUserName = (user?: { firstName: string | null; lastName: string | null }) => {
  if (!user) return '-'
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return full || '-'
}
