export interface ClientReservationError {
  key: string
  values?: Record<string, string>
}

export function resolveClientReservationError(
  message: unknown,
): ClientReservationError | null
