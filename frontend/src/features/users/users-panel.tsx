import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import type { DataTableColumn } from '../shell/admin/ui/data-table'
import type { UserRow } from './user-types'
import { UsersList } from './users-list'
import { UsersPagination } from './users-pagination'

type ActiveTab = 'admins' | 'stylists' | 'clients'
type Props = {
  activeTab: ActiveTab
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>
  admins: UserRow[]; stylists: UserRow[]; clients: UserRow[]; loading: boolean
  clientsSearch: string; setClientsSearch: Dispatch<SetStateAction<string>>
  page: number; setPage: Dispatch<SetStateAction<number>>; total: number; totalPages: number
  visiblePageNumbers: { pages: number[]; totalPages: number }
  onPaginationFocusFallback: () => void
  userColumns: DataTableColumn<UserRow>[]; renderUserCard: (user: UserRow) => ReactNode
}
export function UsersPanel({ activeTab, setActiveTab, admins, stylists, clients, loading, clientsSearch, setClientsSearch, page, setPage, total, totalPages, visiblePageNumbers, onPaginationFocusFallback, userColumns, renderUserCard }: Props) {
  const { t } = useTranslation()
  const tabCount = activeTab === 'admins' ? admins.length : activeTab === 'stylists' ? stylists.length : total
  const headerTitle = t(`users.tabs.${activeTab}`, { count: tabCount })

  return (
    <>
    <Card>
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto flex-wrap justify-start gap-1 p-2">
              <TabsTrigger value="admins">{t('users.tabs.admins', { count: admins.length })}</TabsTrigger>
              <TabsTrigger value="stylists">{t('users.tabs.stylists', { count: stylists.length })}</TabsTrigger>
              <TabsTrigger value="clients">{t('users.tabs.clients', { count: total })}</TabsTrigger>
            </TabsList>

            {activeTab === 'clients' ? (
              <div className="relative w-full max-w-[360px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-strong" aria-hidden="true" />
                <Input
                  className="pl-9"
                  aria-label={t('users.searchClients')}
                  placeholder={t('users.searchClients')}
                  value={clientsSearch}
                  onChange={(e) => setClientsSearch(e.target.value)}
                />
              </div>
            ) : (
              <div className="text-sm text-content-strong">{headerTitle}</div>
            )}
          </div>

          <TabsContent value="admins" className="mt-4">
            <UsersList loading={loading} items={admins} columns={userColumns} renderCard={renderUserCard} />
          </TabsContent>
          <TabsContent value="stylists" className="mt-4">
            <UsersList loading={loading} items={stylists} columns={userColumns} renderCard={renderUserCard} />
          </TabsContent>
          <TabsContent value="clients" className="mt-4">
            <UsersList loading={loading} items={clients} columns={userColumns} renderCard={renderUserCard} />
          </TabsContent>
        </Tabs>
      </div>
    </Card>

    {activeTab === 'clients' ? (
      <UsersPagination total={total} page={page} totalPages={totalPages} visiblePageNumbers={visiblePageNumbers} setPage={setPage} onFocusFallback={onPaginationFocusFallback} />
    ) : null}

    </>
  )
}
