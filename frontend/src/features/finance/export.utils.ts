import { buildPrintReportHtml, escapeCsvCell } from './export-safety.mjs'

export type ExportColumn<T> = {
  header: string
  value: (row: T) => string | number
}

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Excel na bs-BA locale očekuje `;` kao separator; BOM osigurava ispravne dijakritike. */
export const exportRowsToCsv = <T>(params: {
  filename: string
  columns: ExportColumn<T>[]
  rows: T[]
  summary?: (string | number)[]
}): void => {
  const header = params.columns.map((c) => escapeCsvCell(c.header)).join(';')
  const body = params.rows.map((row) =>
    params.columns.map((c) => escapeCsvCell(c.value(row))).join(';'),
  )
  const lines = [header, ...body]
  if (params.summary?.length) {
    lines.push('')
    lines.push(params.summary.map(escapeCsvCell).join(';'))
  }
  downloadBlob(
    new Blob([`\uFEFF${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    }),
    `${params.filename}.csv`,
  )
}

/** Štampa u zaseban prozor; korisnik bira "Save as PDF" u dijalogu štampe. */
export const printReport = (params: {
  title: string
  language?: 'bs' | 'en'
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  summary?: { label: string; value: string }[]
}): void => {
  const win = window.open('', '_blank', 'width=900,height=650')
  if (!win) return
  win.opener = null
  win.document.write(buildPrintReportHtml(params))
  win.document.close()
  win.focus()
  win.print()
}
