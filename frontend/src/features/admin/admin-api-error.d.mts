export interface AdminApiError {
  key: string
  values?: Record<string, string>
}

/** Isti resolver, ali s interpolacijskim vrijednostima (preklapanje termina, rok za dolazak). */
export function resolveAdminApiError(message: unknown, fallbackKey: string): AdminApiError

export function resolveAdminApiErrorKey(
  message: unknown,
  fallbackKey: string,
): string
