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

export const statusClassMap: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  STYLIST_REVIEW: 'bg-orange-100 text-orange-800 border-orange-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  ATTENDANCE_CONFIRMED: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELLED_BY_CLIENT: 'bg-rose-100 text-rose-800 border-rose-200',
  CANCELLED_BY_STYLISTS: 'bg-rose-100 text-rose-800 border-rose-200',
  NO_SHOW: 'bg-slate-100 text-slate-800 border-slate-200',
}
