import { BadRequestException } from '@nestjs/common'

export const safeJsonParse = <T>(value: string, errorMessage: string): T => {
  try {
    return JSON.parse(value) as T
  } catch {
    throw new BadRequestException(errorMessage)
  }
}

export const safeJsonParseArray = <T>(
  value: string,
  errorMessage: string,
): T[] => {
  const parsed = safeJsonParse<unknown>(value, errorMessage)
  if (!Array.isArray(parsed)) {
    throw new BadRequestException(errorMessage)
  }
  return parsed as T[]
}
