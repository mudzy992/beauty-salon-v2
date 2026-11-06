export type PublicHomeFeaturedReview = {
  id: string
  serviceRating: number
  stylistRating: number | null
  comment: string | null
  user?: { firstName: string | null; lastName: string | null; avatar?: string | null } | null
  service?: { name: string } | null
}

export function parsePublicHomeFeaturedReview(
  payload: unknown,
): PublicHomeFeaturedReview | null | undefined
