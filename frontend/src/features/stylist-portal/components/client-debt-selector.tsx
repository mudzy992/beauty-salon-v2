import type { ClientDebt } from '../types'

type ClientDebtSelectorProps = {
  debts: ClientDebt[]
  isLoading: boolean
  profileId: string | null
  selectedDebtIds: Record<string, boolean>
  selectedDebtSum: number
  onToggle: (debtId: string) => void
}

export const ClientDebtSelector = ({
  debts,
  isLoading,
  profileId,
  selectedDebtIds,
  selectedDebtSum,
  onToggle,
}: ClientDebtSelectorProps) => (
  <div className="space-y-2">
    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
      Dugovanja klijenta
    </p>
    {isLoading ? (
      <p className="text-sm text-slate-600 dark:text-slate-300">Učitavanje…</p>
    ) : debts.length === 0 ? (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Nema otvorenih dugovanja.
      </p>
    ) : (
      <div className="grid gap-2">
        {debts.slice(0, 6).map((debt) => {
          const selected = !!selectedDebtIds[debt.id]
          const stylistName = debt.stylistProfile?.user
            ? `${debt.stylistProfile.user.firstName ?? ''} ${debt.stylistProfile.user.lastName ?? ''}`.trim() ||
              'Stilist'
            : 'Stilist'
          return (
            <button
              key={debt.id}
              type="button"
              onClick={() => onToggle(debt.id)}
              className={
                selected
                  ? 'w-full rounded-md border border-brand-champagne bg-brand-champagne/10 px-3 py-2 text-left'
                  : 'w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/30'
              }
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {debt.service?.name ?? 'Usluga'} · {Number(debt.amount).toFixed(2)} KM
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {debt.stylistProfileId === profileId
                  ? 'Dug kod vas'
                  : `Dug kod ${stylistName}`}{' '}
                · {debt.createdAt.slice(0, 10)}
              </p>
            </button>
          )
        })}
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Odabrana dugovanja će biti dodata na ukupnu cijenu i neće se računati u
          napojnicu.
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Ukupno za dugovanja: {selectedDebtSum.toFixed(2)} KM
        </p>
      </div>
    )}
  </div>
)
