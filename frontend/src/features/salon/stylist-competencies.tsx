import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import type { ServiceOption } from './stylist-types'

type Props = {
  selectedServices: ServiceOption[]; unselectedServices: ServiceOption[]; allServices: ServiceOption[]
  stylistServiceIds: string[]; toggleService: (id: string) => void
}
export function StylistCompetencies({ selectedServices, unselectedServices, allServices, stylistServiceIds, toggleService }: Props) {
  const { t } = useTranslation()
  const selectedHeadingRef = useRef<HTMLParagraphElement>(null)
  const availableHeadingRef = useRef<HTMLParagraphElement>(null)
  const competencyName = (service: ServiceOption) => {
    const matches = allServices.filter(candidate => candidate.name === service.name)
    return matches.length > 1 ? `${service.name} (${matches.findIndex(candidate => candidate.id === service.id) + 1})` : service.name
  }
  return (
            <div className="space-y-4">
              <div>
                <p ref={selectedHeadingRef} tabIndex={-1} className="mb-1 text-xs text-content-strong ">{t('stylists.selectedCompetencies')} ({t('stylists.removeCompetencyHint')})</p>
                {selectedServices.length === 0 ? (
                  <p className="text-sm text-content-strong">{t('stylists.noSelectedCompetencies')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedServices.map((svc) => (
                      <Badge key={svc.id} variant="secondary" className="gap-1 px-2 py-1 text-[11px] font-medium">
                        <span>{svc.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => { availableHeadingRef.current?.focus(); toggleService(svc.id) }}
                          className="h-5 w-5 rounded-full hover:bg-surface-sunken"
                          aria-label={t('stylists.aria.removeCompetency', { name: competencyName(svc) })}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p ref={availableHeadingRef} tabIndex={-1} className="mb-1 text-xs text-content-strong ">{t('stylists.availableCompetencies')}</p>
                {unselectedServices.length === 0 ? (
                  <p className="text-sm text-content-strong">{t('stylists.allCompetenciesSelected')}</p>
                ) : (
                  <div className="max-h-[320px] space-y-2 overflow-y-auto">
                    {unselectedServices.map((svc) => (
                      <label
                        key={svc.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 hover:bg-surface-muted"
                      >
                        <input
                          type="checkbox"
                          checked={stylistServiceIds.includes(svc.id)}
                          onChange={() => { selectedHeadingRef.current?.focus(); toggleService(svc.id) }}
                          className="mt-0.5 h-4 w-4 accent-brand-gold-ring"
                        />
                        <span className="text-sm">
                          <span className="font-medium text-content">{svc.name}</span>
                          {svc.subcategory ? (
                            <span className="ml-1 text-content-strong">
                              ({svc.subcategory.category?.name} &gt; {svc.subcategory.name})
                            </span>
                          ) : null}
                          {competencyName(svc) !== svc.name ? <span className="sr-only">{competencyName(svc).slice(svc.name.length)}</span> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {allServices.length === 0 ? <p className="text-sm text-content-strong">{t('stylists.noServicesAvailable')}</p> : null}
              </div>
            </div>
  )
}
