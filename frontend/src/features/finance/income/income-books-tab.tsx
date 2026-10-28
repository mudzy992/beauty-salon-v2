import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { BookList } from '../components/book-list'
import { BookPeriodPicker } from '../components/book-period-picker'
import { ErrorState } from '../components/data-state'
import { IncomeBookDetail } from './income-book-detail'
import { fetchIncomeBookForMonth } from '../api/income-books.api'
import { useIncomeBooks } from '../hooks/use-income-books'
import { financeKeys } from '../hooks/query-keys'
import { toNumber } from '../finance.utils'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { getDateTimePartsInTimeZone } from '../../../../../shared/business-date.mjs'

export function IncomeBooksTab() {
  const { t } = useTranslation()
  const { toastApiError } = useAppToast()
  const queryClient = useQueryClient()
  const booksQuery = useIncomeBooks()

  const salonPeriod = getDateTimePartsInTimeZone(new Date())
  const [year, setYear] = useState(salonPeriod.year)
  const [month, setMonth] = useState(salonPeriod.month)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenMonth = async () => {
    setIsOpening(true)
    try {
      const book = await fetchIncomeBookForMonth(year, month)
      await queryClient.invalidateQueries({
        queryKey: financeKeys.incomeBooks(),
      })
      setSelectedBookId(book.id)
    } catch (err) {
      toastApiError(err, t('finance.book.openFailed'))
    } finally {
      setIsOpening(false)
    }
  }

  if (selectedBookId) {
    return (
      <IncomeBookDetail
        bookId={selectedBookId}
        onBack={() => setSelectedBookId(null)}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('finance.book.openForMonth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BookPeriodPicker
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onOpen={() => void handleOpenMonth()}
            openLabel={t('finance.book.openBook')}
            isPending={isOpening}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('finance.incomeBook')}</CardTitle>
        </CardHeader>
        <CardContent>
          {booksQuery.isError ? (
            <ErrorState
              description={t('finance.book.incomeBooksLoadFailed')}
              onRetry={() => void booksQuery.refetch()}
            />
          ) : (
            <BookList
              rows={(booksQuery.data ?? []).map((book) => ({
                id: book.id,
                year: book.year,
                month: book.month,
                isLocked: Boolean(book.closedAt),
                primaryAmount: toNumber(book.totalRevenue),
                secondaryAmount: toNumber(book.totalTips),
              }))}
              isLoading={booksQuery.isLoading}
              primaryLabel={t('finance.summary.revenue')}
              secondaryLabel={t('finance.summary.tips')}
              emptyTitle={t('finance.empty.noIncomeBooks')}
              onOpen={setSelectedBookId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
