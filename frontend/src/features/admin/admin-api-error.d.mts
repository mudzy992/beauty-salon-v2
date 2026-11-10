export interface AdminApiError {
  key: string
  values?: Record<string, string>
}

/**
 * Isti resolver, ali s interpolacijskim vrijednostima (preklapanje termina, rok za dolazak).
 * `code` je stabilni kod greške iz backend registra; kad je poznat ima prednost nad tekstom.
 */
export function resolveAdminApiError(
  message: unknown,
  fallbackKey: string,
  code?: unknown,
): AdminApiError

export function resolveAdminApiErrorKey(
  message: unknown,
  fallbackKey: string,
  code?: unknown,
): string
