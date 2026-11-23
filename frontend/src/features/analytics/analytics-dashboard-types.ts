interface MonthlyFinance {
  year: number
  month: number
  label: string
  income: number
  expenses: number
  tips: number
}

interface StylistPerformance {
  stylistProfileId: string
  stylistName: string
  completedCount: number
  revenue: number
  tips: number
}

interface TopServiceRow {
  serviceId: string
  serviceName: string
  count: number
  revenue: number
}

interface PeriodExpenseCategoryRow {
  categoryId: string
  categoryName: string
  total: number
}

interface PeriodFinance {
  servicesRevenue: number
  tips: number
  totalIncome: number
  expensesByCategory: PeriodExpenseCategoryRow[]
  totalExpenses: number
  netProfit: number
}

export interface AnalyticsDashboard {
  monthlyFinance: MonthlyFinance[]
  stylistPerformance: StylistPerformance[]
  topServices: TopServiceRow[]
  conversionRate: number | null
  totalPending: number
  totalCompleted: number
  fromDate: string
  toDate: string
  periodFinance: PeriodFinance
}

