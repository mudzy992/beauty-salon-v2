import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useSessionQuery as useQuery } from '../../query/use-session-query'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { UserRow, ClientDebtRow } from './user-types'

type Params = { editUser: UserRow | null; editOpen: boolean; showApiError: (error: unknown, fallbackKey: string) => void }
export function useUserDebts({ editUser, editOpen, showApiError }: Params) {
  const { t } = useTranslation()
  const { success } = useAppToast()
  const [debtToWriteOff, setDebtToWriteOff] = useState<string | null>(null)
  const [writeOffPending, setWriteOffPending] = useState(false)
  const queryClient = useQueryClient()
  const clientDebtsQuery = useQuery({
    queryKey: ['client-debts', editUser?.id ?? ''],
    enabled: Boolean(
      editOpen && editUser?.userRoles?.some((userRole) => userRole.role.name === 'CLIENT'),
    ),
    queryFn: async (): Promise<ClientDebtRow[]> => {
      if (!editUser) return []
      const { data } = await api.get('/api/client-debts', {
        params: { clientId: editUser.id },
      })
      if (!Array.isArray(data)) throw new Error('Invalid client debts response')
      return data
    },
  })

  const handleWriteOffClientDebt = async (reason: string) => {
    if (!editUser || !debtToWriteOff) return
    setWriteOffPending(true)
    try {
      await api.patch(`/api/client-debts/${debtToWriteOff}/write-off`, { note: reason })
      success(t('users.toast.debtWrittenOff'))
      await queryClient.invalidateQueries({
        queryKey: ['client-debts', editUser.id],
      })
      setDebtToWriteOff(null)
    } catch (err) {
      showApiError(err, 'users.errors.writeOffFailed')
    } finally {
      setWriteOffPending(false)
    }
  }

  return { clientDebtsQuery, debtToWriteOff, setDebtToWriteOff, writeOffPending, handleWriteOffClientDebt }
}
