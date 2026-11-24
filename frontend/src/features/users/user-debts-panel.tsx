import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import type { ClientDebtRow } from './user-types'

type Props = {
  clientDebtsQuery: { isLoading: boolean; isError: boolean; data: ClientDebtRow[] | undefined; refetch: () => Promise<unknown> }
  setDebtToWriteOff: Dispatch<SetStateAction<string | null>>
}
export function UserDebtsPanel({ clientDebtsQuery, setDebtToWriteOff }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <div className="space-y-2 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="mb-0">{t('users.debts.title')}</Label>
        {clientDebtsQuery.isLoading ? (
          <span role="status" className="text-xs text-content-strong">
            {t('users.debts.loading')}
          </span>
        ) : null}
      </div>

      {clientDebtsQuery.isLoading ? null : clientDebtsQuery.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <span>{t('finance.states.errorTitle')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void clientDebtsQuery.refetch()}
          >
            {t('finance.states.retry')}
          </Button>
        </div>
      ) : (clientDebtsQuery.data ?? []).length === 0 ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
          {t('users.debts.none')}
        </div>
      ) : (
        <div className="space-y-2">
          {(clientDebtsQuery.data ?? []).map((d, index) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface p-3 text-sm  "
            >
              <div className="min-w-0">
                <div className="font-medium text-content">
                  {formatLocalizedAmount(d.amount, i18n.language)}
                  {d.service?.name ? <span className="ml-2 text-xs text-content-strong">• {d.service.name}</span> : null}
                </div>
                {d.note ? <div className="mt-1 text-xs text-content-strong ">{d.note}</div> : null}
                {d.createdBy?.username ? (
                  <div className="mt-1 text-xs text-content-strong ">{t('users.debts.enteredBy', { username: d.createdBy.username })}</div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={t('users.debts.writeOffAction', { service: d.service?.name || t('users.debts.unspecifiedService'), amount: formatLocalizedAmount(d.amount, i18n.language), number: index + 1 })}
                onClick={() => setDebtToWriteOff(d.id)}
              >
                {t('users.debts.writeOff')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
