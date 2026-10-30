function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error) || !isRecord(error.response)) return fallback;
  const data = error.response.data;
  if (!isRecord(data)) return fallback;

  const message = data.message;
  if (typeof message === 'string' && message.trim()) return message.trim().slice(0, 1000);
  if (Array.isArray(message)) {
    const readable = message
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, 5)
      .map((item) => item.trim().slice(0, 300));
    if (readable.length > 0) return readable.join('\n');
  }
  return fallback;
}
