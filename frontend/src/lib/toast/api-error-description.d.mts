export function resolveApiErrorDescription(
  raw: unknown,
  language: string,
  translate: (key: string, values?: Record<string, string>) => string,
): string | undefined
