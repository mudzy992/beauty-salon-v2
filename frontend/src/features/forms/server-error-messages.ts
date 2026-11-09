/**
 * Izvlači validacijske poruke iz odgovora backend-a.
 *
 * Zašto postoji: `use-daily-log-form.ts` je u `catch` grani bacao **cijeli** odgovor i
 * prikazivao generički `saveFailed`. Backend koristi `ValidationPipe`
 * (`backend/src/main.ts:75-78`) s DTO dekoratorima (`@IsUUID`, `@IsArray`, …), pa 400 vraća
 * `{ statusCode, message: string[] | string, error }`. Prijedlozi za ispravku su dakle
 * **poznati**, a WCAG 3.3.3 traži da se daju korisniku — zato se više ne odbacuju.
 */
export function serverValidationMessages(err: unknown): string[] {
  if (typeof err !== 'object' || err === null) return []

  const response = (err as { response?: unknown }).response
  if (typeof response !== 'object' || response === null) return []

  const data = (response as { data?: unknown }).data
  if (typeof data !== 'object' || data === null) return []

  const message = (data as { message?: unknown }).message

  if (typeof message === 'string') {
    const trimmed = message.trim()
    return trimmed ? [trimmed] : []
  }
  if (Array.isArray(message)) {
    return message
      .filter((m): m is string => typeof m === 'string')
      .map((m) => m.trim())
      .filter((m) => m.length > 0)
  }
  return []
}
