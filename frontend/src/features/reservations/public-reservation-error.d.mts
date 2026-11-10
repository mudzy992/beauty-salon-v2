export interface PublicReservationError {
  key: string
  values?: Record<string, string>
}

export function resolvePublicReservationError(
  message: unknown,
  code?: unknown,
): PublicReservationError | null
