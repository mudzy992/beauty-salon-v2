import { useTranslation } from 'react-i18next'

import { IncomeBooksTab } from './tabs/income-books-tab'
import { ExpenseBooksTab } from './tabs/expense-books-tab'
import { ExpenseCategoriesTab } from './tabs/expense-categories-tab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'

export function FinancePage() {
  const { t } = useTranslation()
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t('nav.finance')}
        </h1>
      </div>

      <Tabs defaultValue="income">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="income">Knjiga Prihoda</TabsTrigger>
          <TabsTrigger value="expense">Knjiga Rashoda</TabsTrigger>
          <TabsTrigger value="categories">Kategorije Rashoda</TabsTrigger>
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
      </Tabs>
    </div>
  )
}

