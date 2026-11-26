import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../../api/client'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'

/** Repayment dialog state and its existing POST/refresh/toast flow. */
export const useStylistDebtRepayment = (refetch: () => Promise<unknown>) => {
  const { t } = useTranslation()
  const { toastApiError, success } = useAppToast()
  const [repayOpen, setRepayOpen] = useState(false)
  const [repayDebtId, setRepayDebtId] = useState<string | null>(null)
  const [repayDate, setRepayDate] = useState(() => getSalonDateOnly())
  const [repayNote, setRepayNote] = useState('')
  const [repaying, setRepaying] = useState(false)

  const openRepay = (debtId: string) => {
    setRepayDebtId(debtId)
    setRepayDate(getSalonDateOnly())
    setRepayNote('')
    setRepayOpen(true)
  }

  const submitRepay = async () => {
    if (!repayDebtId) return
    setRepaying(true)
    try {
      await api.post(`/api/client-debts/${repayDebtId}/repay`, {
        date: repayDate,
        note: repayNote.trim() || undefined,
      })
      success(t('stylistPortal.debts.repaidTitle'), t('stylistPortal.debts.repaidDescription'))
      setRepayOpen(false)
      await refetch()
    } catch (err) {
      toastApiError(err, t('stylistPortal.debts.repayFailed'))
    } finally {
      setRepaying(false)
    }
  }

  return {
    repayOpen,
    setRepayOpen,
    repayDate,
    setRepayDate,
    repayNote,
    setRepayNote,
    repaying,
    openRepay,
    submitRepay,
  }
}
