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
import { ExpenseBookDetail } from './expense-book-detail'
import { fetchExpenseBookForMonth } from '../api/expense-books.api'
import { useExpenseBooks } from '../hooks/use-expense-books'
import { financeKeys } from '../hooks/query-keys'
import { toNumber } from '../finance.utils'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { getDateTimePartsInTimeZone } from '../../../../../shared/business-date.mjs'

export function ExpenseBooksTab() {
  const { t } = useTranslation()
  const { toastApiError } = useAppToast()
  const queryClient = useQueryClient()
  const booksQuery = useExpenseBooks()

  const salonPeriod = getDateTimePartsInTimeZone(new Date())
  const [year, setYear] = useState(salonPeriod.year)
  const [month, setMonth] = useState(salonPeriod.month)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenMonth = async () => {
    setIsOpening(true)
    try {
      const book = await fetchExpenseBookForMonth(year, month)
      await queryClient.invalidateQueries({
        queryKey: financeKeys.expenseBooks(),
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
      <ExpenseBookDetail
        bookId={selectedBookId}
        onBack={() => setSelectedBookId(null)}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          {/* h2, ne `CardTitle` (koji renderuje h3): stranica `/admin/finance` ima h1, pa bi
              h3 preskočio nivo. axe `heading-order` to javlja kao "Heading order invalid"
              (izmjereno na runu 42923727266, ruta /admin/finance). Klase su one koje
              `CardTitle` već daje uz `text-base`, pa se izgled ne mijenja. */}
          <h2 className="text-base font-semibold leading-none tracking-tight">
            {t('finance.book.openForMonth')}
          </h2>
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
          <CardTitle className="text-base">
            {t('finance.expenseBook')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {booksQuery.isError ? (
            <ErrorState
              description={t('finance.book.expenseBooksLoadFailed')}
              onRetry={() => void booksQuery.refetch()}
            />
          ) : (
            <BookList
              rows={(booksQuery.data ?? []).map((book) => ({
                id: book.id,
                year: book.year,
                month: book.month,
                isLocked: book.isClosed,
                primaryAmount: toNumber(book.totalExpenses),
              }))}
              isLoading={booksQuery.isLoading}
              primaryLabel={t('finance.expenses')}
              emptyTitle={t('finance.empty.noExpenseBooks')}
              onOpen={setSelectedBookId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
