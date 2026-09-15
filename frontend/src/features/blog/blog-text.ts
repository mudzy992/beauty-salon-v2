export const toPlainText = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const toExcerpt = (value: string, maxLen: number): string => {
  const text = toPlainText(value)
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen).trimEnd()}…`
}
