import { useCallback, useEffect, useRef, useState } from 'react'
import { parseDateOnly } from '../../../../shared/business-date.mjs'
import api from '../../api/client'
import type { AnalyticsDashboard } from './analytics-dashboard-types'

export function useAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const requestSequence = useRef(0)
  const lastParams = useRef<Record<string, string>>({ monthsBack: '12' })
  const [loadError, setLoadError] = useState(false)

  const load = useCallback((params: Record<string, string>) => {
    const sequence = ++requestSequence.current
    lastParams.current = params
    setLoading(true)
    setLoadError(false)
    setData(null)
    api
      .get<AnalyticsDashboard>('/api/analytics/dashboard', { params })
      .then((res) => {
        if (sequence !== requestSequence.current) return
        const value = res.data
        if (!value || !value.periodFinance || !Array.isArray(value.monthlyFinance) ||
            !Array.isArray(value.stylistPerformance) || !Array.isArray(value.topServices) ||
            !Array.isArray(value.periodFinance.expensesByCategory) ||
            !parseDateOnly(value.fromDate) || !parseDateOnly(value.toDate) ||
            ![value.periodFinance.servicesRevenue, value.periodFinance.tips, value.periodFinance.totalIncome,
              value.periodFinance.totalExpenses, value.periodFinance.netProfit, value.totalPending, value.totalCompleted].every(Number.isFinite) ||
            (value.conversionRate !== null && !Number.isFinite(value.conversionRate)) ||
            !value.monthlyFinance.every(row => Number.isInteger(row.year) && Number.isInteger(row.month) && row.month >= 1 && row.month <= 12 && [row.income, row.expenses, row.tips].every(Number.isFinite)) ||
            !value.periodFinance.expensesByCategory.every(row => Number.isFinite(row.total)) ||
            !value.stylistPerformance.every(row => [row.completedCount, row.revenue, row.tips].every(Number.isFinite)) ||
            !value.topServices.every(row => [row.count, row.revenue].every(Number.isFinite))) throw new Error('Invalid analytics response')
        setData(value)
      })
      .catch(() => { if (sequence === requestSequence.current) setLoadError(true) })
      .finally(() => { if (sequence === requestSequence.current) setLoading(false) })
  }, [])

  useEffect(() => {
    load({ monthsBack: '12' })
    return () => { requestSequence.current += 1 }
  }, [load])

  return { data, loading, loadError, load, lastParams }
}
