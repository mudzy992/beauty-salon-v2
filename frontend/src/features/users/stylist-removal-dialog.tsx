import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import type { StylistRemovalPreview, UserRow } from './user-types'

type Key = 'dailyLogs' | 'confirmedReservations' | 'reservationResponses' | 'reviews'
type Mode = 'DELETE' | 'TRANSFER'
type Props = {
  removeStylistOpen: boolean
  removalSubmitting: boolean
  removalTriggerRef: RefObject<HTMLButtonElement>
  removalPreview: StylistRemovalPreview | null
  removeStylistUser: UserRow | null
  financialTarget: string
  setFinancialTarget: Dispatch<SetStateAction<string>>
  financialConfirmed: boolean
  setFinancialConfirmed: Dispatch<SetStateAction<boolean>>
  getTargetOptions: () => { id: string; label: string; isPending: boolean }[]
  removalModes: Record<Key, Mode>
  setRemovalModes: Dispatch<SetStateAction<Record<Key, Mode>>>
  removalTargets: Partial<Record<Key, string>>
  setRemovalTargets: Dispatch<SetStateAction<Partial<Record<Key, string>>>>
  removalSummary: { label: string; count: number; mode: Mode }[]
  isRemovalReady: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}
export function StylistRemovalDialog({ removeStylistOpen, removalSubmitting, removalTriggerRef, removalPreview, removeStylistUser, financialTarget, setFinancialTarget, financialConfirmed, setFinancialConfirmed, getTargetOptions, removalModes, setRemovalModes, removalTargets, setRemovalTargets, removalSummary, isRemovalReady, onOpenChange, onConfirm }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={removeStylistOpen} onOpenChange={onOpenChange}>
      <DialogContent data-users-dialog className="max-w-3xl" onCloseAutoFocus={(event) => {
        if (removalTriggerRef.current?.isConnected) {
          event.preventDefault()
          removalTriggerRef.current.focus()
        }
      }}>
        <DialogHeader>
          <DialogTitle>{t('users.stylistRemoval.title')}</DialogTitle>
        </DialogHeader>

        {!removalPreview ? (
          <div role="status" aria-live="polite" className="flex justify-center py-10 text-content-strong">
            <span className="sr-only">{t('common.loading')}</span>
            <Loader2 className="h-7 w-7 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-content-strong ">
              {t('users.stylistRemoval.stylist', { username: removeStylistUser?.username ?? '' })}
            </p>

            {(removalPreview.financial.clientDebtsCount > 0 || removalPreview.financial.manualIncomeCount > 0) ? (
              <div className="space-y-3 rounded-md border border-amber-300 p-4 dark:border-amber-700">
                <p className="text-sm font-medium">{t('users.stylistRemoval.financialWarning', {
                  debts: removalPreview.financial.clientDebtsCount,
                  income: removalPreview.financial.manualIncomeCount,
                })}</p>
                <div className="space-y-2">
                  <Label htmlFor="users-financial-transfer-target">{t('users.stylistRemoval.financialTarget')}</Label>
                  <Select id="users-financial-transfer-target" aria-required="true"

                    value={financialTarget}
                    onChange={(e) => { setFinancialTarget(e.target.value); setFinancialConfirmed(false) }}>
                    <option value="">{t('users.stylistRemoval.chooseTarget')}</option>
                    {getTargetOptions().map((option) => (
                      <option key={option.id} value={option.id} disabled={option.isPending}>{option.label}{option.isPending ? ` ${t('users.stylistRemoval.pendingOption')}` : ''}</option>
                    ))}
                  </Select>
                  {!getTargetOptions().some(option => !option.isPending) ? (
                    <p className="text-sm text-content-strong">{t('users.stylistRemoval.noFinancialTarget')}</p>
                  ) : null}
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={financialConfirmed} onChange={(e) => setFinancialConfirmed(e.target.checked)} />
                  <span>{t('users.stylistRemoval.financialConfirm')}</span>
                </label>
              </div>
            ) : null}
            {removalPreview.financial.bookedDailyLogsCount > 0 ? (
              <Alert variant="warning">
                <AlertDescription>{t('users.stylistRemoval.bookedLogs', { count: removalPreview.financial.bookedDailyLogsCount })}</AlertDescription>
              </Alert>
            ) : null}

            {([
              { key: 'dailyLogs', label: t('users.stylistRemoval.categories.dailyLogs'), count: removalPreview.counts.dailyLogEntriesCount },
              { key: 'confirmedReservations', label: t('users.stylistRemoval.categories.confirmedReservations'), count: removalPreview.counts.confirmedReservationsCount },
              { key: 'reservationResponses', label: t('users.stylistRemoval.categories.reservationResponses'), count: removalPreview.counts.reservationResponsesCount },
              { key: 'reviews', label: t('users.stylistRemoval.categories.reviews'), count: removalPreview.counts.reviewsCount },
            ] as const).map((row) => {
              if (row.count <= 0) return null
              const opts = getTargetOptions()
              const mode = removalModes[row.key]
              return (
                <fieldset key={row.key} className="rounded-md border border-line p-4 ">
                  <legend className="px-1 font-medium text-content">{row.label}</legend>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge variant="secondary">{row.count}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name={`${row.key}-mode`}
                        value="TRANSFER"
                        checked={mode === 'TRANSFER'}
                        onChange={() => setRemovalModes((prev) => ({ ...prev, [row.key]: 'TRANSFER' }))}
                      />
                      <span>{t('users.stylistRemoval.transfer')}</span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name={`${row.key}-mode`}
                        value="DELETE"
                        checked={mode === 'DELETE'}
                        onChange={() => setRemovalModes((prev) => ({ ...prev, [row.key]: 'DELETE' }))}
                      />
                      <span>{t('users.stylistRemoval.delete')}</span>
                    </label>
                  </div>

                  {mode === 'TRANSFER' ? (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor={`users-stylist-removal-target-${row.key}`}>{t('users.stylistRemoval.target')}</Label>
                      <Select id={`users-stylist-removal-target-${row.key}`}

                        value={(removalTargets as any)[row.key] ?? ''}
                        onChange={(e) => setRemovalTargets((prev) => ({ ...prev, [row.key]: e.target.value }))}
                      >
                        <option value="">{t('users.stylistRemoval.chooseTarget')}</option>
                        {opts.map((o) => (
                          <option key={o.id} value={o.id} disabled={o.isPending}>
                            {o.label}
                            {o.isPending ? ` ${t('users.stylistRemoval.pendingOption')}` : ''}
                          </option>
                        ))}
                      </Select>
                      {opts.some((o) => o.isPending) ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {t('users.stylistRemoval.pendingWarning')}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('users.stylistRemoval.deleteWarning')}</p>
                  )}
                </fieldset>
              )
            })}

            {removalSummary.length > 0 ? (
              <div className="rounded-md border border-line p-4 ">
                <p className="mb-2 font-medium text-content">{t('users.stylistRemoval.summary')}</p>
                <div className="space-y-1 text-sm">
                  {removalSummary.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-3">
                      <span className="text-content-strong">
                        {r.label} ({r.count})
                      </span>
                      <span className={r.mode === 'DELETE' ? 'font-medium text-rose-700 dark:text-rose-300' : 'font-medium text-blue-700 dark:text-blue-300'}>
                        {r.mode === 'DELETE' ? t('users.stylistRemoval.deleteSummary') : t('users.stylistRemoval.transferSummary')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <Alert>
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              <p className="mb-1 font-medium leading-none tracking-tight">{t('users.stylistRemoval.noteTitle')}</p>
              <AlertDescription>
                {t('users.stylistRemoval.note')}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" disabled={removalSubmitting} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            data-users-remove-action
            className="border-rose-200 text-rose-900 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
            onClick={onConfirm}
            disabled={!removalPreview || !isRemovalReady || removalSubmitting}
          >
            {removalSubmitting ? t('users.stylistRemoval.removing') : t('users.stylistRemoval.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
