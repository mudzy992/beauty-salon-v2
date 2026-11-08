export type DashboardStats = {
  usersCount: number
  stylistsCount: number
  servicesCount: number
  reservationsThisMonth: number
  pendingReservations: number
  completedReservations: number
  /** KIF totalRevenue = prihod od servisa (bez napojnica) */
  servicesRevenueThisMonth: number
  tipsThisMonth: number
  expensesThisMonth: number
  pendingReviews: number
  blogPostsCount: number
}

export type RecentReservation = {
  id: string
  reservationDate: string
  startTime: string
  status: string
  createdAt?: string
  client?: {
    id: string
    firstName?: string | null
    lastName?: string | null
    username?: string
  }
  service?: { name: string }
}
