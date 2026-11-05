export type PrintReportParams = {
  title: string
  language?: 'bs' | 'en'
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  summary?: { label: string; value: string }[]
}

export function escapeCsvCell(value: string | number): string
export function escapeHtmlText(value: string | number | null | undefined): string
export function buildPrintReportHtml(params: PrintReportParams): string
