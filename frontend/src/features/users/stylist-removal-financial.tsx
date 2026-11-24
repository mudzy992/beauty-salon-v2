import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import type { StylistRemovalPreview } from './user-types'

type Props = {
  removalPreview: StylistRemovalPreview; financialTarget: string; setFinancialTarget: Dispatch<SetStateAction<string>>
  financialConfirmed: boolean; setFinancialConfirmed: Dispatch<SetStateAction<boolean>>
  getTargetOptions: () => { id: string; label: string; isPending: boolean }[]
}
export function StylistRemovalFinancial({ removalPreview, financialTarget, setFinancialTarget, financialConfirmed, setFinancialConfirmed, getTargetOptions }: Props) {
  const { t } = useTranslation()
  return (<>
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
  </>)
}
