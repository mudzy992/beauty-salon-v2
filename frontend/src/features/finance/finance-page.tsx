import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { IncomeBooksTab } from './income/income-books-tab'
import { ExpenseBooksTab } from './expense/expense-books-tab'
import { ExpenseCategoriesTab } from './catalog/expense-categories-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import Debtors from '../../pages/Debtors'

const FINANCE_TABS = ['income', 'expense', 'categories', 'debtors'] as const
type FinanceTab = (typeof FINANCE_TABS)[number]

const isFinanceTab = (value: string | null): value is FinanceTab =>
  !!value && (FINANCE_TABS as readonly string[]).includes(value)

export function FinancePage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = isFinanceTab(searchParams.get('tab')) ? searchParams.get('tab')! : 'income'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t('nav.finance')}
        </h1>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = new URLSearchParams(searchParams)
          if (value === 'income') next.delete('tab')
          else next.set('tab', value)
          setSearchParams(next, { replace: true })
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="income">{t('finance.tabs.income')}</TabsTrigger>
          <TabsTrigger value="expense">{t('finance.tabs.expense')}</TabsTrigger>
          <TabsTrigger value="categories">{t('finance.tabs.categories')}</TabsTrigger>
          <TabsTrigger value="debtors">{t('nav.debtors')}</TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <IncomeBooksTab />
        </TabsContent>
        <TabsContent value="expense">
          <ExpenseBooksTab />
        </TabsContent>
        <TabsContent value="categories">
          <ExpenseCategoriesTab />
        </TabsContent>
        <TabsContent value="debtors">
          <Debtors embedded />
        </TabsContent>
      </Tabs>
    </div>
  )
}
