import type { Expense, ExpenseAttachment } from '../finance.types'

export const normalizeForMatch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const findAttachmentForLabel = (
  attachments: ExpenseAttachment[] | undefined,
  label: string,
): ExpenseAttachment | null => {
  const list = attachments ?? []
  if (list.length === 0 || !label.trim()) return null
  const wanted = normalizeForMatch(label)
  const direct = list.find((a) =>
    normalizeForMatch(a.upload?.originalName ?? '').includes(wanted),
  )
  if (direct) return direct
  return (
    list.find((a) => {
      const name = normalizeForMatch(a.upload?.originalName ?? '')
      const tokens = wanted.split(' ').filter(Boolean)
      return tokens.length > 0 && tokens.every((token) => name.includes(token))
    }) ?? null
  )
}

export const renameFileForLabel = (file: File, label: string): File => {
  const safePrefix = normalizeForMatch(label).replace(/\s+/g, '-') || 'stavka'
  const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : ''
  return new File([file], `${safePrefix}${ext}`, { type: file.type })
}

export const hasMappedAttachment = (
  expense: Expense | null | undefined,
  label: string,
  pendingName?: string,
): boolean => {
  if (pendingName) return true
  return Boolean(findAttachmentForLabel(expense?.attachments, label))
}
