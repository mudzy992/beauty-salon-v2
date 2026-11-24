import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import type { StylistRemovalPreview } from './user-types'

import type { RemovalKey, RemovalMode } from './stylist-removal-types'
type Props = {
  removalPreview: StylistRemovalPreview; getTargetOptions: () => { id: string; label: string; isPending: boolean }[]
  removalModes: Record<RemovalKey, RemovalMode>; setRemovalModes: Dispatch<SetStateAction<Record<RemovalKey, RemovalMode>>>
  removalTargets: Partial<Record<RemovalKey, string>>; setRemovalTargets: Dispatch<SetStateAction<Partial<Record<RemovalKey, string>>>>
}
export function StylistRemovalRecords({ removalPreview, getTargetOptions, removalModes, setRemovalModes, removalTargets, setRemovalTargets }: Props) {
  const { t } = useTranslation()
  return (<>
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

                        value={removalTargets[row.key] ?? ''}
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

  </>)
}
