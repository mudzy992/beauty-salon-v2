import { useTranslation } from 'react-i18next'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import type { ServiceMutationAction } from './service-deletion-types'
import type { Service } from './service-types'

type Props = {
  deletionSaving: boolean; deletionAction: ServiceMutationAction; deletionTargetId: string
  availableMergeTargets: Service[]; selectDeletionAction: (action: ServiceMutationAction) => void
  onTargetChange: (target: string) => void
}
export function ServiceDeletionOptions({ deletionSaving, deletionAction, deletionTargetId, availableMergeTargets, selectDeletionAction, onTargetChange }: Props) {
  const { t } = useTranslation()
  return (<>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={deletionSaving}
                aria-pressed={deletionAction === 'DELETE_LINKED_RECORDS'}
                onClick={() => selectDeletionAction('DELETE_LINKED_RECORDS')}
                className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring ${deletionAction === 'DELETE_LINKED_RECORDS' ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30' : 'border-line'}`}
              >
                <span className="block text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {t('services.deletion.deleteMode')}
                </span>
                <span className="mt-1 block text-xs leading-5 text-content-strong ">
                  {t('services.deletion.deleteModeDescription')}
                </span>
              </button>
              <button
                type="button"
                disabled={deletionSaving}
                aria-pressed={deletionAction === 'MERGE'}
                onClick={() => selectDeletionAction('MERGE')}
                className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring ${deletionAction === 'MERGE' ? 'border-brand-gold-ring bg-amber-50 dark:bg-amber-950/20' : 'border-line'}`}
              >
                <span className="block text-sm font-semibold text-content">
                  {t('services.deletion.mergeMode')}
                </span>
                <span className="mt-1 block text-xs leading-5 text-content-strong ">
                  {t('services.deletion.mergeModeDescription')}
                </span>
              </button>
            </div>

            {deletionAction === 'MERGE' ? (
              <div>
                <Label htmlFor="service-merge-target">
                  {t('services.deletion.targetService')}
                </Label>
                <Select
                  id="service-merge-target"
                  disabled={deletionSaving}
                  className="mt-1"
                  value={deletionTargetId}
                  onChange={(event) => onTargetChange(event.target.value)}
                >
                  <option value="">
                    {t('services.deletion.chooseTarget')}
                  </option>
                  {availableMergeTargets.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

  </>)
}
