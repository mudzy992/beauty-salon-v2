export interface StylistAnalyticsData {
  stylist: {
    id: string
    name: string
    user?: { id: string; username: string; email: string | null; firstName: string | null; lastName: string | null }
  }
  fromDate: string | null
  toDate: string | null
  completedCount: number
  revenue: number
  tips: number
  topServices: { serviceId: string; serviceName: string; count: number; revenue: number }[]
  recentEntries: { id: string; date: string; serviceName: string | null; clientName: string | null; actualPrice: unknown; tipAmount: unknown }[]
}

