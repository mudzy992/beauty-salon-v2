import type { Category } from './service-catalog-types'
import type { Service } from './service-types'
import type { ServiceDeletionImpact, ServiceMutationAction } from './service-deletion-types'

/**
 * Ciljevi spajanja (merge) — sve usluge osim one koja se briše.
 */
export const mergeTargetsFor = (
  categories: Category[],
  deletedServiceId: string | undefined,
): Service[] =>
  categories
    .flatMap((category) => category.subcategories ?? [])
    .flatMap((subcategory) => subcategory.services ?? [])
    .filter((service) => service.id !== deletedServiceId)

/** Postoje li sukobi pri spajanju (rezervacije, dnevnik, recenzije, outbox). */
export const hasMergeConflicts = (impact: ServiceDeletionImpact | null): boolean =>
  Object.values(impact?.mergeConflicts ?? {}).some((count) => count > 0)

/** ima li za obradu događaja iz outbox-a (spriječava spajanje dok se ne isprani). */
export const hasProcessingOutboxEvents = (impact: ServiceDeletionImpact | null): boolean =>
  (impact?.mergeConflicts.processingOutboxEvents ?? 0) > 0

/** Zahtjev za brisanje ili spajanje usluge. */
export const buildServiceDeletionRequest = (params: {
  serviceId: string
  action: ServiceMutationAction
  confirmationName: string
  impactToken: string
  targetServiceId: string
}) => ({
  url: `/api/services/${params.serviceId}`,
  data: {
    action: params.action,
    confirmationName: params.confirmationName,
    impactToken: params.impactToken,
    ...(params.action === 'MERGE' ? { targetServiceId: params.targetServiceId } : {}),
  },
})
